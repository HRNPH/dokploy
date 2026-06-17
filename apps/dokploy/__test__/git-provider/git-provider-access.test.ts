import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	canEditDeployGitSource,
	getAccessibleGitProviderIds,
} from "@dokploy/server/services/git-provider";

const mockDb = vi.hoisted(() => ({
	query: {
		gitProvider: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
		},
		member: {
			findFirst: vi.fn(),
		},
	},
}));

vi.mock("@dokploy/server/db", () => ({ db: mockDb }));

const ORG_ID = "org-1";
const USER_OWNER = "user-owner";
const USER_ADMIN = "user-admin";
const USER_MEMBER = "user-member";
const USER_MEMBER_2 = "user-member-2";

const providers = [
	{ gitProviderId: "gp-1", userId: USER_OWNER, sharedWithOrganization: false },
	{ gitProviderId: "gp-2", userId: USER_OWNER, sharedWithOrganization: true },
	{ gitProviderId: "gp-3", userId: USER_MEMBER, sharedWithOrganization: false },
];

beforeEach(() => {
	vi.clearAllMocks();
	mockDb.query.gitProvider.findMany.mockResolvedValue(providers);
});

describe("getAccessibleGitProviderIds", () => {
	it("owner can access all org providers", async () => {
		mockDb.query.member.findFirst.mockResolvedValue({
			role: "owner",
			accessedGitProviders: [],
		});
		const result = await getAccessibleGitProviderIds(ORG_ID, USER_OWNER);
		expect(result.size).toBe(3);
	});

	it("admin can access all org providers", async () => {
		mockDb.query.member.findFirst.mockResolvedValue({
			role: "admin",
			accessedGitProviders: [],
		});
		const result = await getAccessibleGitProviderIds(ORG_ID, USER_ADMIN);
		expect(result.size).toBe(3);
	});

	it("member can access owned + shared + assigned providers", async () => {
		mockDb.query.member.findFirst.mockResolvedValue({
			role: "member",
			accessedGitProviders: ["gp-1"],
		});
		const result = await getAccessibleGitProviderIds(ORG_ID, USER_MEMBER);
		expect(result.has("gp-1")).toBe(true); // assigned
		expect(result.has("gp-2")).toBe(true); // shared
		expect(result.has("gp-3")).toBe(true); // owned
	});

	it("member without assignments can only access owned + shared", async () => {
		mockDb.query.member.findFirst.mockResolvedValue({
			role: "member",
			accessedGitProviders: [],
		});
		const result = await getAccessibleGitProviderIds(ORG_ID, USER_MEMBER_2);
		expect(result.has("gp-1")).toBe(false);
		expect(result.has("gp-2")).toBe(true); // shared
		expect(result.has("gp-3")).toBe(false);
	});
});
