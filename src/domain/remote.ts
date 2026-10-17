import type { Mut, Payout, Plan, Status } from "./types";

/** One payout as the API last returned it, in the shape the screens already render. */
export interface RemoteHit {
	p: Payout;
	mut: Mut;
	plan: Plan;
	status: Status;
	asOf: string;
}

let payouts: Payout[] | null = null;
const hits = new Map<string, RemoteHit>();
const fingerprints = new WeakMap<Plan, string>();

let verifyCache: {
	tamper: number | null;
	result: { ok: boolean; brokenAt?: number };
} | null = null;

export function remotePayouts(): Payout[] | null {
	return payouts;
}

export function remoteHit(id: string): RemoteHit | undefined {
	return hits.get(id);
}

export function rememberFingerprint(plan: Plan, fp: string) {
	fingerprints.set(plan, fp);
}

export function fingerprintOf(plan: Plan): string | undefined {
	return fingerprints.get(plan);
}

export function setRemote(next: RemoteHit[] | null) {
	hits.clear();
	if (!next) {
		payouts = null;
		return;
	}
	payouts = next.map((h) => h.p);
	for (const hit of next) hits.set(hit.p.id, hit);
}

export function setServerVerify(
	tamper: number | null,
	result: { ok: boolean; brokenAt?: number },
) {
	verifyCache = { tamper, result };
}

export function serverVerify() {
	return verifyCache;
}
