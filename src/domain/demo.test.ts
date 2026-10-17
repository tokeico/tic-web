import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { initialState, type TourStep } from "../state/store";
import { respond, SUGGESTIONS } from "./agent";
import { payoutById } from "./data";
import { PAGE_GUIDES, TOUR_WHY } from "./demo-guide";
import { mOf, plan } from "./engine";
import { iso } from "./format";
import type { AppState } from "./types";

function tour(
	api: Record<string, unknown>,
	go = (_view: string) => {},
	state = initialState(),
) {
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
		"get",
		"mOf",
		"remoteHit",
		"iso",
		`${outputText}\nreturn makeTour;`,
	)(
		api,
		go,
		(country: string) => `demo-${country.toLowerCase()}`,
		() => state,
		mOf,
		() => ({ asOf: iso(state.day) }),
		iso,
	)() as TourStep[];
}

test("Brazil stays on Ponte through Oct 30 and reroutes on Oct 31", () => {
	const state = initialState();
	const brazil = payoutById("br");
	assert.equal(
		plan(brazil, "2026-10-30", state).rec?.route.off?.id,
		"br-ponte",
	);
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
	const steps = tour({
		setDay: (value: number) => {
			day = value;
		},
	});
	const step = steps.find((s) => s.time === "1:10");
	assert.match(step?.title ?? "", /Oct 31/);
	await step?.act();
	assert.equal(iso(day), "2026-10-31");
});

test("tour reconciles Brazil before showing its Ledger entry", async () => {
	const calls: string[] = [];
	const steps = tour(
		{
			reconcile: async (id: string) => {
				calls.push(id);
				return true;
			},
		},
		(view) => {
			calls.push(view);
		},
	);
	const step = steps.find((s) => /journal|ledger/i.test(s.title));
	assert.ok(step);
	await step.act();
	assert.deepEqual(calls, ["demo-br", "ledger"]);
	assert.ok(
		steps.indexOf(step) > steps.findIndex((s) => /Pay on/.test(s.title)),
	);
	assert.ok(
		steps.indexOf(step) > steps.findIndex((s) => /fraud/.test(s.title)),
	);
});

test("approval is a closing decision after fraud, screening, radar and audit", () => {
	const steps = tour({});
	const firstApproval = steps.findIndex(
		(step) => step.title === "Approve Brazil",
	);
	for (const title of [
		/fraud/,
		/screening/,
		/radar/,
		/audit chain/,
		/tampering/,
	]) {
		assert.ok(
			steps.findIndex((step) => title.test(step.title)) < firstApproval,
		);
	}
	assert.ok(
		firstApproval < steps.findIndex((step) => /Pay on/.test(step.title)),
	);
});

test("tour opens the real approval controls without approving on the user’s behalf", async () => {
	const opened: string[] = [];
	const state = initialState();
	const steps = tour(
		{
			open: (id: string) => {
				opened.push(id);
			},
		},
		undefined,
		state,
	);
	const brazil = steps.find((step) => step.title === "Approve Brazil");
	const mexico = steps.find((step) => step.title === "Approve Mexico");
	assert.ok(brazil && mexico);
	assert.equal(brazil.ready, false);
	assert.equal(mexico.ready, false);
	await brazil.act();
	await mexico.act();
	assert.deepEqual(opened, ["demo-br", "demo-mx"]);
	state.mut["demo-br"] = { approvals: [], final: "approved" };
	assert.equal(brazil.ready, true);
	assert.equal(mexico.ready, false);
});

test("screening and radar wait for an actual interaction", () => {
	const state: AppState = initialState();
	const steps = tour({}, undefined, state);
	const screening = steps.find((step) =>
		/fictional screening/.test(step.title),
	);
	const radar = steps.find((step) => /radar/.test(step.title));
	assert.equal(screening?.ready, false);
	assert.equal(radar?.ready, false);
	state.screeningDemo = true;
	state.radar = "rejected";
	assert.equal(screening?.ready, true);
	assert.equal(radar?.ready, true);
});

test("every tour step and main screen explains why it matters", () => {
	for (const step of tour({})) {
		assert.ok(step.task);
		assert.ok(step.actionLabel);
		assert.ok(TOUR_WHY[step.title], step.title);
	}
	for (const path of [
		"/app",
		"/overview",
		"/inbox",
		"/agent",
		"/trust",
		"/ledger",
		"/customize",
	]) {
		assert.ok(PAGE_GUIDES[path]?.what);
		assert.ok(PAGE_GUIDES[path]?.why);
		assert.ok(PAGE_GUIDES[path]?.tryIt);
		assert.ok(PAGE_GUIDES[path]?.terms.length);
	}
});

test("tour does not open the Ledger when reconciliation fails", async () => {
	const calls: string[] = [];
	const steps = tour({ reconcile: async () => false }, (view) => {
		calls.push(view);
	});
	const step = steps.find((s) => /journal|ledger/i.test(s.title));
	assert.ok(step);
	assert.equal(await step.act(), false);
	assert.deepEqual(calls, []);
});
