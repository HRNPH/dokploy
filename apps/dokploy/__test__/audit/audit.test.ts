import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@dokploy/server/db", () => ({
	db: {
		insert: vi.fn(() => ({
			values: vi.fn(() => Promise.resolve()),
		})),
		query: {
			auditLog: {
				findMany: vi.fn(() => Promise.resolve([
					{ id: "log1", action: "create", resourceType: "project", userEmail: "admin@test.com" },
					{ id: "log2", action: "deploy", resourceType: "application", userEmail: "user@test.com" },
				])),
			},
		},
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					groupBy: vi.fn(() => Promise.resolve([
						{ action: "create", count: 5 },
						{ action: "deploy", count: 3 },
					])),
				})),
			})),
		})),
	},
}));

vi.mock("@dokploy/server/db/schema", () => ({
	auditLog: { organizationId: "organizationId", action: "action", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
	eq: vi.fn(),
	desc: vi.fn(),
	and: vi.fn(),
	gte: vi.fn(),
	lte: vi.fn(),
	sql: vi.fn(),
}));

describe("Audit Log Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("audit function creates log entry", async () => {
		const { audit } = await import("@/server/api/utils/audit");

		const ctx = {
			user: { id: "user-1", email: "admin@test.com", role: "owner" },
			session: { activeOrganizationId: "org-1" },
		};

		await audit(ctx, {
			action: "create",
			resourceType: "project",
			resourceId: "proj-1",
			resourceName: "my-project",
		});

		const { db } = await import("@dokploy/server/db");
		expect(db.insert).toHaveBeenCalled();
	});

	it("audit function handles errors gracefully", async () => {
		const { audit } = await import("@/server/api/utils/audit");

		const { db } = await import("@dokploy/server/db");
		(db.insert as any).mockImplementation(() => {
			throw new Error("DB error");
		});

		const ctx = {
			user: { id: "user-1", email: "admin@test.com", role: "owner" },
			session: { activeOrganizationId: "org-1" },
		};

		// Should not throw
		await expect(
			audit(ctx, { action: "create", resourceType: "project" }),
		).resolves.toBeUndefined();
	});
});
