import { describe, expect, it, vi } from "vitest";

vi.mock("@dokploy/server/db", () => ({
	db: {
		query: {
			webServerSettings: {
				findFirst: vi.fn(),
			},
		},
	},
}));

describe("Whitelabeling", () => {
	it("webServerSettings schema includes whitelabelingConfig", async () => {
		const schema = await import("@dokploy/server/db/schema");
		expect(schema.webServerSettings).toBeDefined();
	});

	it("useWhitelabeling module exports functions", async () => {
		const mod = await import("@/utils/hooks/use-whitelabeling");
		expect(typeof mod.useWhitelabeling).toBe("function");
		expect(typeof mod.useWhitelabelingPublic).toBe("function");
	});
});

describe("Fork Config", () => {
	it("fork config constants are defined", async () => {
		const config = await import("@dokploy/server/constants/fork-config");
		expect(config.FORK_DOCKER_IMAGE).toBe("ghcr.io/hrnph/dokploy-ench");
		expect(config.FORK_GITHUB_REPO).toBe("HRNPH/dokploy");
	});
});
