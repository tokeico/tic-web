import { n as __toESM } from "./assets/rolldown-runtime-CuZPuSbt.js";
import { JSDOM } from "jsdom";
//#region tools/smoke.tsx
/**
* Smoke test: mounts the real app in jsdom and drives the demo script.
*
* Run with:  npm run smoke
* (Built by Vite in SSR mode so TSX and the @/ alias resolve, then run in node.)
*/
var dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
	url: "http://localhost/",
	pretendToBeVisual: true
});
var g = globalThis;
g.window = dom.window;
g.self = dom.window;
g.document = dom.window.document;
g.localStorage = dom.window.localStorage;
Object.defineProperty(globalThis, "navigator", {
	value: dom.window.navigator,
	configurable: true
});
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.getComputedStyle = dom.window.getComputedStyle;
g.scrollTo = () => {};
dom.window.scrollTo = () => {};
g.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
g.cancelAnimationFrame = (id) => clearTimeout(id);
g.IS_REACT_ACT_ENVIRONMENT = true;
var React = await import("./assets/react-CrZLdmVh.js").then((m) => /* @__PURE__ */ __toESM(m.default, 1));
var { createRoot } = await import("./assets/client-Ds3udF0b.js").then((m) => /* @__PURE__ */ __toESM(m.default, 1));
var { RouterProvider, createRouter, createMemoryHistory } = await import("./assets/index.dev-Bf4WYUWm.js");
var { routeTree } = await import("./assets/router-1L7L-EYH.js");
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var act = async (fn) => {
	await React.act(async () => {
		await fn();
	});
};
var failures = 0;
var check = (label, cond, extra = "") => {
	console.log((cond ? "  ok   " : "  FAIL ") + label + (cond || !extra ? "" : " → " + extra));
	if (!cond) failures++;
};
var router = createRouter({
	routeTree,
	history: createMemoryHistory({ initialEntries: ["/app"] })
});
var root = createRoot(document.getElementById("root"));
await act(async () => {
	root.render(React.createElement(RouterProvider, { router }));
	await router.load();
});
var text = () => document.body.textContent || "";
var byText = (needle) => [...document.querySelectorAll("button, a")].find((el) => (el.textContent || "").trim().replace(/\s+/g, " ") === needle || el.getAttribute("aria-label") === needle);
var click = async (needle) => {
	const el = byText(needle);
	if (!el) throw new Error("no clickable element: " + needle);
	if (el.disabled) throw new Error("element is disabled: " + needle);
	await act(() => {
		el.click();
	});
};
var clickEl = async (el) => {
	await act(() => {
		el.click();
	});
};
var goto = async (path) => {
	await act(async () => {
		await router.navigate({ to: path });
	});
	await act(() => sleep(0));
};
var setRange = async (value) => {
	const input = document.getElementById("asof");
	const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
	await act(() => {
		setter.call(input, String(value));
		input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	});
};
console.log("\nShell");
check("the lockup links back to the landing page", document.querySelector("a[aria-label=\"Corredor home\"]")?.getAttribute("href") === "/");
console.log("\nOverview");
check("hero line renders", text().includes("AI reads and explains. Code decides. A person approves."));
check("pipeline stage count", (text().match(/Reconcile and book/g) || []).length >= 1);
check("rules badge counts active rules", /Rules pack v1 · \d of 9 active/.test(text()));
console.log("\nLoad the demo invoices");
await click("Load the demo invoices");
await act(() => sleep(1700));
check("four payouts loaded", text().includes("Decisions with sources") && text().includes("4/4"));
check("Mexico waits for a second approver", text().includes("needs a second approver"));
console.log("\nInbox");
await goto("/inbox");
var rows = () => [...document.querySelectorAll("[role=\"row\"]")].slice(1);
check("four rows", rows().length === 4, String(rows().length));
var rowText = (i) => (rows()[i].textContent || "").replace(/\s+/g, " ");
check("Brazil is ready via Ponte Digital", /Ponte Digital/.test(rowText(0)) && /Ready/.test(rowText(0)), rowText(0));
check("Mexico awaits 2nd approver", /Awaiting 2nd approver/.test(rowText(1)), rowText(1));
check("Argentina carries a warning", /1 warning/.test(rowText(2)), rowText(2));
check("Venezuela is blocked", /Blocked/.test(rowText(3)) && /No compliant route/.test(rowText(3)), rowText(3));
console.log("\nAs-of date reroutes (the demo moment)");
await click("Open Estúdio Paulista Design Ltda INV-2026-0412");
check("detail pane opened", text().includes("Rules checklist") && text().includes("Decision fingerprint"));
await setRange(5);
check("Sep 30 routes via PagaFX (pre Res. 561)", /PagaFX/.test(rowText(0)), rowText(0));
await setRange(6);
check("Oct 1 reroutes off the eFX provider", !/PagaFX/.test(rowText(0)) && /Ponte Digital/.test(rowText(0)), rowText(0));
check("toast names BR-561-EFX", text().includes("BR-561-EFX took effect"));
await setRange(35);
check("Oct 30 reroutes to the authorized VASP", /Sol VASP/.test(rowText(0)), rowText(0));
check("toast names BR-VASP-AUTH", text().includes("BR-VASP-AUTH took effect"));
await setRange(22);
check("back to today", /Ponte Digital/.test(rowText(0)), rowText(0));
console.log("\nApprove, pay, reconcile");
var ack = document.querySelector(".ack input");
await clickEl(ack);
check("warning acknowledged", ack.checked);
await click("Approve as Maria Lopez");
check("approved and plan locked", text().includes("Plan locked at approval"));
await click("Pay $15,740.74 via Ponte Digital");
await act(() => sleep(1100));
check("payment refs appear", text().includes("Tx hash") && text().includes("Pix ref"));
await click("Reconcile and book");
check("booked", text().includes("Booked · view in ledger"));
console.log("\nLedger + audit chain");
await goto("/ledger");
check("journal entry booked", /JE-2026-10-/.test(text()) && text().includes("Matched"));
check("journal has an FX line", /FX (gain|loss)/.test(text()));
await goto("/audit");
check("chain verifies", /Chain verified · \d+ events/.test(text()));
await clickEl([...document.querySelectorAll("button")].find((b) => (b.textContent || "").startsWith("Simulate tampering")));
check("tampering breaks the chain", /Chain broken at #\d/.test(text()));
await clickEl([...document.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === "Undo tamper"));
check("undo restores the chain", /Chain verified/.test(text()));
console.log("\nAgent");
await goto("/agent");
await click("What needs my attention today?");
await act(() => sleep(1200));
check("agent answers with a status summary", /As of Oct 17, 2026:/.test(text()));
await click("Can we pay Transportes Orinoco?");
await act(() => sleep(1200));
check("sanctions answer cites VE-OFAC", text().includes("VE-OFAC"));
check("license sign-off card queued", text().includes("Record an OFAC general license"));
console.log("\nFraud defense");
await goto("/inbox");
await click("Simulate a suspicious invoice");
check("fifth invoice is held", text().includes("Security hold"));
check("injection is quoted, not followed", text().includes("Treated as data, not followed."));
check("approval is frozen", text().includes("Approval is frozen until a person resolves this."));
console.log("\nTrust + customize");
await goto("/trust");
check("radar proposal awaits compliance", text().includes("Awaiting compliance"));
check("agent has no money-moving tools", text().includes("No money-moving tools for the agent"));
await click("Approve as Daniel Ortiz · Compliance");
check("registry update applied", text().includes("Approved · Daniel Ortiz"));
await goto("/customize");
check("rules pack lists 9 rules", (text().match(/Hard block|Warning|Required fields/g) || []).length >= 9);
await clickEl([...document.querySelectorAll("button")].find((b) => (b.textContent || "").startsWith("Fewest warnings")));
check("routing preference is applied to the engine", (document.querySelector("[aria-label=\"Routing preference\"] [aria-pressed=\"true\"]")?.textContent || "").startsWith("Fewest warnings"));
await goto("/inbox");
check("a booked payout keeps its locked plan", /Ponte Digital/.test(document.querySelectorAll("[role=\"row\"]")[1].textContent || ""));
await goto("/audit");
check("the preference change is in the audit log", text().includes("Routing preference set to Fewest warnings"));
check("settings changes are attributed to a person", text().includes("(by Maria Lopez)"));
console.log("\n" + (failures ? failures + " FAILURE(S)" : "all checks passed"));
process.exit(failures ? 1 : 0);
//#endregion
export {};
