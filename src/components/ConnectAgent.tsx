import { useEffect, useState } from "react";
import type { z } from "zod";
import { listMcpTools, type McpTool } from "@/lib/auth";
import { Disclosure } from "./ui";

const PLACEHOLDER_KEY = "ck_your_read_only_key";

type Client = {
	id: string;
	label: string;
	where: string;
	config: (url: string, key: string) => string;
};

const json = (value: unknown) => JSON.stringify(value, null, 2);

const CLIENTS: Client[] = [
	{
		id: "claude-code",
		label: "Claude Code",
		where: "Run in your terminal.",
		config: (url, key) =>
			`claude mcp add --transport http corredor ${url} \\\n  --header "Authorization: Bearer ${key}"`,
	},
	{
		id: "cursor",
		label: "Cursor",
		where: "Add to ~/.cursor/mcp.json.",
		config: (url, key) =>
			json({
				mcpServers: {
					corredor: { url, headers: { Authorization: `Bearer ${key}` } },
				},
			}),
	},
	{
		id: "vscode",
		label: "VS Code",
		where:
			"Add to .vscode/mcp.json. VS Code asks for the key once and stores it securely, so the file is safe to commit.",
		config: (url) =>
			json({
				inputs: [
					{
						type: "promptString",
						id: "corredor-key",
						description: "Corredor read-only API key",
						password: true,
					},
				],
				servers: {
					corredor: {
						type: "http",
						url,
						headers: { Authorization: `Bearer \${input:corredor-key}` },
					},
				},
			}),
	},
	{
		id: "claude-desktop",
		label: "Claude Desktop",
		where:
			"Add to claude_desktop_config.json (Settings → Developer → Edit Config). Needs Node.js for the mcp-remote bridge.",
		config: (url, key) =>
			json({
				mcpServers: {
					corredor: {
						command: "npx",
						args: [
							"-y",
							"mcp-remote",
							url,
							"--header",
							`Authorization:\${CORREDOR_AUTH}`,
						],
						env: { CORREDOR_AUTH: `Bearer ${key}` },
					},
				},
			}),
	},
	{
		id: "codex",
		label: "Codex",
		where:
			"Add to ~/.codex/config.toml, then export CORREDOR_API_KEY with your key in your shell.",
		config: (url) =>
			`[mcp_servers.corredor]\nurl = "${url}"\nbearer_token_env_var = "CORREDOR_API_KEY"`,
	},
];

/**
 * Copy-paste setup for the read-only /mcp endpoint. A key created on this
 * visit is filled in; otherwise the snippet shows a placeholder, since stored
 * keys are only hashes and can't be shown again.
 */
export function ConnectAgent({ secret }: { secret: string }) {
	const [clientId, setClientId] = useState(CLIENTS[0].id);
	const [url, setUrl] = useState("/mcp");
	const [tools, setTools] = useState<z.infer<typeof McpTool>[]>([]);
	const [copied, setCopied] = useState("");
	useEffect(() => {
		setUrl(`${window.location.origin}/mcp`);
		let cancelled = false;
		listMcpTools()
			.then((list) => {
				if (!cancelled) setTools(list);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);
	const client = CLIENTS.find((c) => c.id === clientId) ?? CLIENTS[0];
	const snippet = client.config(url, secret || PLACEHOLDER_KEY);
	async function copy(text: string, what: string) {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(`${what} copied.`);
		} catch {
			setCopied("Could not copy. Select the text and copy it manually.");
		}
	}
	return (
		<div className="flex min-w-0 flex-col gap-3 rounded-md border border-edge-bright p-4">
			<h3 className="m-0 text-base font-semibold">Connect your agent</h3>
			<p className="m-0 text-sm text-ash">
				Point any MCP client at <code className="mono break-all">{url}</code>{" "}
				with a read-only key as a <code className="mono">Bearer</code> token.
			</p>
			<div
				role="group"
				aria-label="Agent client"
				className="flex flex-wrap gap-2"
			>
				{CLIENTS.map((c) => (
					<button
						key={c.id}
						type="button"
						className={`jump min-h-10${c.id === clientId ? " jump-on" : ""}`}
						aria-pressed={c.id === clientId}
						onClick={() => {
							setClientId(c.id);
							setCopied("");
						}}
					>
						{c.label}
					</button>
				))}
			</div>
			<p className="m-0 text-sm text-ash">{client.where}</p>
			{!secret && snippet.includes(PLACEHOLDER_KEY) && (
				<p className="m-0 text-sm text-ash-dim">
					Create a key above and it will be filled in here.
				</p>
			)}
			<pre className="mono m-0 overflow-x-auto rounded-md border border-edge bg-sunk p-3 text-[12.5px] leading-relaxed text-bone">
				{snippet}
			</pre>
			<div className="flex flex-wrap items-center gap-3">
				<button
					type="button"
					className="btn btn-sm max-sm:min-h-10"
					onClick={() => void copy(snippet, `${client.label} configuration`)}
				>
					Copy configuration
				</button>
				<button
					type="button"
					className="btn btn-sm max-sm:min-h-10"
					onClick={() => void copy(url, "MCP endpoint")}
				>
					Copy endpoint
				</button>
				{copied && (
					<span role="status" className="text-sm text-ash">
						{copied}
					</span>
				)}
			</div>
			{tools.length > 0 && (
				<Disclosure
					summary={`What your agent can do (${tools.length} read-only tools)`}
				>
					<ul className="m-0 flex list-none flex-col gap-2 p-0 pt-2">
						{tools.map((tool) => (
							<li key={tool.name} className="text-sm">
								<code className="mono text-bone">{tool.name}</code>
								{tool.description && (
									<span className="ml-2 text-ash">{tool.description}</span>
								)}
							</li>
						))}
					</ul>
				</Disclosure>
			)}
		</div>
	);
}
