import { db } from "@dokploy/server/db";
import { organization, server } from "@dokploy/server/db/schema";
import { getWebServerSettings } from "@dokploy/server/services/web-server-settings";
import { eq } from "drizzle-orm";
import { LOCAL_PARTITION } from "./in-memory-queue";

export const resolveBuildsConcurrency = async (
	partition: string,
): Promise<number> => {
	try {
		if (partition === LOCAL_PARTITION) {
			return await resolveLocalConcurrency();
		}
		return await resolveServerConcurrency(partition);
	} catch (error) {
		console.error(
			"Failed to resolve builds concurrency, defaulting to 1",
			error,
		);
		return 1;
	}
};

export const assertBuildsConcurrencyAllowed = async (
	_value: number,
	_organizationId: string,
): Promise<void> => {
	// No license gating - all concurrency allowed
};

const resolveLocalConcurrency = async (): Promise<number> => {
	const settings = await getWebServerSettings();
	return settings?.buildsConcurrency ?? 1;
};

const resolveServerConcurrency = async (serverId: string): Promise<number> => {
	const currentServer = await db.query.server.findFirst({
		where: eq(server.serverId, serverId),
		columns: { buildsConcurrency: true },
	});

	return currentServer?.buildsConcurrency ?? 1;
};
