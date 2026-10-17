// Client-only state: the parts of the design that don't live in the API
// (agent chat and queue, tour, toast, local preferences). A tiny external
// store read through useSyncExternalStore: no extra dependency.

import { useSyncExternalStore } from "react";

export interface ToastLine {
	head: string;
	body: string;
}

export interface AgentMessage {
	role: "user" | "agent";
	text?: string;
	tools?: string[];
	paras?: string[];
	bullets?: string[];
	cites?: string[];
	note?: string;
	cta?: {
		label: string;
		kind: "open" | "trust" | "inbox";
		payoutId?: string;
	} | null;
}

export type ActionKind = "approve" | "pay" | "reconcile" | "email" | "asof";
export type ActionStatus = "pending" | "done" | "dismissed";

export interface AgentAction {
	id: string;
	kind: ActionKind;
	payoutId: string | null;
	risk: "High" | "Medium" | "Low";
	title: string;
	why: string;
	cites: string[];
	status: ActionStatus;
	result?: string;
	body?: string; // email draft
	asOf?: string; // for kind "asof"
}

export type Autonomy = "suggest" | "prepare" | "auto";

export interface DemoState {
	toast: { lines: ToastLine[]; key: number } | null;
	flashId: string | null;
	reroutes: number;
	tour: number | null;
	chat: AgentMessage[];
	input: string;
	busy: { tools: string[] } | null;
	actions: AgentAction[];
	actionSeq: number;
	autoRuns: number;
	autonomy: Autonomy;
	requireAck: boolean;
	acks: Record<string, boolean>;
	radarRejected: boolean;
	copied: string | null;
	/** Set once the user loads the demo invoices this session (drives the loading animation). */
	loading: boolean;
}

export const WELCOME: AgentMessage = {
	role: "agent",
	paras: [
		"I’m the Corredor agent. I read invoices and the rules engine’s results, explain every decision with its sources, and prepare actions for you.",
		"I have no tool that approves, pays, clears a security hold or changes a rule. Those always come back to a person, through the queue on the right.",
	],
};

const initial = (): DemoState => ({
	toast: null,
	flashId: null,
	reroutes: 0,
	tour: null,
	chat: [WELCOME],
	input: "",
	busy: null,
	actions: [],
	actionSeq: 0,
	autoRuns: 0,
	autonomy: "prepare",
	requireAck: true,
	acks: {},
	radarRejected: false,
	copied: null,
	loading: false,
});

let state: DemoState = initial();
const INITIAL = initial();
const listeners = new Set<() => void>();

export const getDemo = () => state;

export function setDemo(
	patch: Partial<DemoState> | ((s: DemoState) => Partial<DemoState>),
): void {
	state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
	for (const l of listeners) l();
}

export function resetDemoState(): void {
	for (const t of timers) clearTimeout(t);
	timers.length = 0;
	state = initial();
	for (const l of listeners) l();
}

export function useDemo<T>(select: (s: DemoState) => T): T {
	return useSyncExternalStore(
		(cb) => {
			listeners.add(cb);
			return () => listeners.delete(cb);
		},
		() => select(state),
		() => select(INITIAL),
	);
}

// ---- Timed helpers -------------------------------------------------------------------------

const timers: ReturnType<typeof setTimeout>[] = [];
export function later(fn: () => void, ms: number): void {
	timers.push(setTimeout(fn, ms));
}

/** Show a toast for 6 s, and flash a row for 1.3 s (the design's timings). */
export function showToast(
	lines: ToastLine[],
	flashId: string | null = null,
): void {
	const key = Date.now();
	setDemo({ toast: { lines, key }, flashId });
	if (flashId)
		later(
			() => getDemo().flashId === flashId && setDemo({ flashId: null }),
			1300,
		);
	later(() => getDemo().toast?.key === key && setDemo({ toast: null }), 6000);
}
