import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@dokploy/server/db", () => ({
	db: {
		query: {
			organizationQuota: {
				findFirst: vi.fn(),
			},
		},
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: vi.fn(() => Promise.resolve([{
					quotaId: "q1",
					organizationId: "org-1",
					maxProjects: 10,
					maxServices: 20,
					maxServers: 3,
					maxMembers: 5,
					maxCpu: 4,
					maxRam: 8,
					maxDisk: 50,
				}])),
			})),
		})),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => ({
					returning: vi.fn(() => Promise.resolve([{ quotaId: "q1" }])),
				})),
			})),
		})),
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => Promise.resolve([{ count: 3 }])),
			})),
		})),
	},
}));

vi.mock("@dokploy/server/db/schema", () => ({
	organizationQuota: { organizationId: "organizationId" },
	projects: { organizationId: "organizationId" },
	applications: { organizationId: "organizationId" },
	compose: { organizationId: "organizationId" },
	server: { organizationId: "organizationId" },
	member: { organizationId: "organizationId" },
}));

vi.mock("drizzle-orm", () => ({
	eq: vi.fn(),
	sql: vi.fn((strings, ...values) => ({ strings, values })),
}));

const { getOrCreateQuota, getUsage, enforceQuota } = await import(
	"@dokploy/server/services/quota"
);

describe("Quota Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getOrCreateQuota", () => {
		it("returns existing quota", async () => {
			const { db } = await import("@dokploy/server/db");
			const existing = { quotaId: "q1", organizationId: "org-1", maxProjects: 10 };
			(db.query.organizationQuota.findFirst as any).mockResolvedValue(existing);

			const result = await getOrCreateQuota("org-1");
			expect(result).toEqual(existing);
		});

		it("creates quota when not found", async () => {
			const { db } = await import("@dokploy/server/db");
			(db.query.organizationQuota.findFirst as any).mockResolvedValue(undefined);

			const result = await getOrCreateQuota("org-1");
			expect(result).toBeDefined();
			expect(result.organizationId).toBe("org-1");
		});
	});

	describe("getUsage", () => {
		it("returns usage object with all resource counts", async () => {
			const usage = await getUsage("org-1");
			expect(usage).toHaveProperty("projects");
			expect(usage).toHaveProperty("services");
			expect(usage).toHaveProperty("servers");
			expect(usage).toHaveProperty("members");
		});
	});

	describe("enforceQuota", () => {
		it("passes when under quota", async () => {
			const { db } = await import("@dokploy/server/db");
			(db.query.organizationQuota.findFirst as any).mockResolvedValue({
				maxProjects: 10,
				maxServices: 20,
				maxServers: 3,
				maxMembers: 5,
			});

			await expect(enforceQuota("org-1", "projects")).resolves.toBeUndefined();
		});

		it("throws when at quota limit", async () => {
			const { db } = await import("@dokploy/server/db");
			(db.query.organizationQuota.findFirst as any).mockResolvedValue({
				maxProjects: 3,
				maxServices: 20,
				maxServers: 3,
				maxMembers: 5,
			});

			await expect(enforceQuota("org-1", "projects")).rejects.toThrow("Quota exceeded");
		});
	});
});
