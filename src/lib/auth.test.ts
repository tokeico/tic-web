import assert from "node:assert/strict";
import { test } from "node:test";
import { authSearch, hasMemberApproved, safeReturnPath } from "./auth";

test("auth return destinations cannot leave the product", () => {
	for (const path of [
		"https://outside.test",
		"//outside.test",
		"/\\outside.test",
		"/agent\\outside.test",
		"/api/auth/signout",
		"/agent\nbad",
	])
		assert.equal(safeReturnPath(path), "/agent");
	assert.equal(safeReturnPath("/inbox"), "/inbox");
	assert.equal(
		safeReturnPath("/compliance?case=demo"),
		"/compliance?case=demo",
	);
});

test("invitation search accepts only bounded opaque tokens", () => {
	assert.deepEqual(
		authSearch({ invitation: `ci_${"a".repeat(43)}`, redirect: "/trust" }),
		{ invitation: `ci_${"a".repeat(43)}`, redirect: "/trust" },
	);
	assert.deepEqual(
		authSearch({ invitation: "<script>", redirect: "//outside.test" }),
		{ invitation: undefined, redirect: "/agent" },
	);
});

test("different accounts with the same name remain different approvers", () => {
	const user = { memberId: "current-member", name: "Same Name" };
	assert.equal(
		hasMemberApproved([{ actorId: "other-member", who: "Same Name" }], user),
		false,
	);
	assert.equal(
		hasMemberApproved(
			[{ actorId: "current-member", who: "An earlier display name" }],
			user,
		),
		true,
	);
});
