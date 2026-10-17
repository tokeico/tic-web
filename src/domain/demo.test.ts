import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { initialState, type TourStep } from "../state/store";
import { respond, SUGGESTIONS } from "./agent";
import { payoutById } from "./data";
import { plan } from "./engine";
import { iso } from "./format";

function tour(api: Record<string, unknown>, go = (_view: string) => {}) {
	const source = ts.createSourceFile(
		"store.tsx",
		readFileSync(new URL("../state/store.tsx", import.meta.url), "utf8"),
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	let factory = "";
	const visit = (node: ts.Node) => {
		if (
			ts.isBinaryExpression(node) &&
			node.left.getText(source) === "api.tourSteps"
		)
			factory = node.right.getText(source);
		ts.forEachChild(node, visit);
	};
	visit(source);
	assert.ok(factory);
	const { outputText } = ts.transpileModule(`const makeTour = ${factory};`, {
		compilerOptions: { target: ts.ScriptTarget.ES2022 },
	});
	return new Function(
		"api",
		"go",
		"countryId",
		`${outputText}\nreturn makeTour;`,
	)(api, go, () => "demo-br")() as TourStep[];
}

test("Brazil stays on Ponte through Oct 30 and reroutes on Oct 31", () => {
	const state = initialState();
	const brazil = payoutById("br");
	assert.equal(plan(brazil, "2026-10-30", state).rec?.route.off?.id, "br-ponte");
	assert.equal(plan(brazil, "2026-10-31", state).rec?.route.off?.id, "br-sol");
});

test("scripted agent previews Oct 31 and proposes that clock date", () => {
	const state = { ...initialState(), loaded: true };
	const reply = respond("What changes on Oct 31?", state);
	assert.ok(SUGGESTIONS.includes("What changes on Oct 31?"));
	assert.ok(reply.msg.tools.some((tool) => tool.includes("2026-10-31")));
	assert.ok(reply.msg.cites.includes("BR-VASP-AUTH"));
	assert.equal(reply.actions?.[0]?.title, "Move the demo clock to Oct 31");
	const automatic = respond("What changes on Oct 31?", {
		...state,
		settings: { ...state.settings, autonomy: "auto" },
	});
	assert.equal(iso(automatic.auto?.day ?? -1), "2026-10-31");
});

test("tour filing-deadline action moves to Oct 31", async () => {
	let day = -1;
	const steps = tour({ setDay: (value: number) => { day = value; } });
	const step = steps.find((s) => s.time === "1:10");
	assert.match(step?.title ?? "", /Oct 31/);
	await step?.act();
	assert.equal(iso(day), "2026-10-31");
});

test("tour reconciles Brazil before showing its Ledger entry", async () => {
	const calls: string[] = [];
	const steps = tour(
		{ reconcile: async (id: string) => { calls.push(id); return true; } },
		(view) => { calls.push(view); },
	);
	const step = steps.find((s) => /journal|ledger/i.test(s.title));
	assert.ok(step);
	await step.act();
	assert.deepEqual(calls, ["demo-br", "ledger"]);
	assert.ok(steps.indexOf(step) > steps.findIndex((s) => s.time === "1:55"));
	assert.ok(steps.indexOf(step) < steps.findIndex((s) => /fraud/.test(s.title)));
});

test("tour does not open the Ledger when reconciliation fails", async () => {
	const calls: string[] = [];
	const steps = tour(
		{ reconcile: async () => false },
		(view) => { calls.push(view); },
	);
	const step = steps.find((s) => /journal|ledger/i.test(s.title));
	assert.ok(step);
	assert.equal(await step.act(), false);
	assert.deepEqual(calls, []);
});
