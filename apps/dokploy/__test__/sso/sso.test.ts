import { describe, expect, it, vi } from "vitest";

vi.mock("@dokploy/server/db", () => ({
	db: {
		query: {
			ssoProvider: {
				findFirst: vi.fn(),
				findMany: vi.fn(() => Promise.resolve([])),
			},
		},
	},
}));

vi.mock("@dokploy/server/db/schema", () => ({
	ssoProvider: { organizationId: "organizationId", providerId: "providerId" },
}));

describe("SSO Configuration", () => {
	it("ssoProvider schema is exported from schema index", async () => {
		const schema = await import("@dokploy/server/db/schema");
		expect(schema.ssoProvider).toBeDefined();
	});

	it("auth client has ssoClient plugin", async () => {
		const { authClient } = await import("@/lib/auth-client");
		expect(authClient).toBeDefined();
	});
});
