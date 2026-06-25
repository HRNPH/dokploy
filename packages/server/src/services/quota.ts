import { db } from "@dokploy/server/db";
import {
	applications,
	compose,
	member,
	organizationQuota,
	projects,
	server,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";

export const getOrCreateQuota = async (organizationId: string) => {
	let quota = await db.query.organizationQuota.findFirst({
		where: eq(organizationQuota.organizationId, organizationId),
	});

	if (!quota) {
		const [created] = await db
			.insert(organizationQuota)
			.values({ organizationId })
			.returning();
		quota = created;
	}

	return quota;
};

export const setQuota = async (
	organizationId: string,
	updates: Partial<typeof organizationQuota.$inferInsert>,
) => {
	const existing = await getOrCreateQuota(organizationId);

	const [updated] = await db
		.update(organizationQuota)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(organizationQuota.organizationId, organizationId))
		.returning();

	return updated;
};

export interface UsageSnapshot {
	projects: number;
	services: number;
	servers: number;
	members: number;
}

export const getUsage = async (
	organizationId: string,
): Promise<UsageSnapshot> => {
	const [projectCount, appCount, composeCount, serverCount, memberCount] =
		await Promise.all([
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(projects)
				.where(eq(projects.organizationId, organizationId))
				.then((r) => r[0]?.count ?? 0),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(applications)
				.where(eq(applications.organizationId, organizationId))
				.then((r) => r[0]?.count ?? 0),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(compose)
				.where(eq(compose.organizationId, organizationId))
				.then((r) => r[0]?.count ?? 0),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(server)
				.where(eq(server.organizationId, organizationId))
				.then((r) => r[0]?.count ?? 0),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(member)
				.where(eq(member.organizationId, organizationId))
				.then((r) => r[0]?.count ?? 0),
		]);

	return {
		projects: projectCount,
		services: appCount + composeCount,
		servers: serverCount,
		members: memberCount,
	};
};

type Resource = "projects" | "services" | "servers" | "members";

export const enforceQuota = async (
	organizationId: string,
	resource: Resource,
	amount = 1,
) => {
	const quota = await getOrCreateQuota(organizationId);
	const usage = await getUsage(organizationId);

	const limits: Record<Resource, number> = {
		projects: quota.maxProjects,
		services: quota.maxServices,
		servers: quota.maxServers,
		members: quota.maxMembers,
	};

	const current = usage[resource];
	const limit = limits[resource];

	if (current + amount > limit) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Quota exceeded for ${resource}: ${current}/${limit}. Request a quota increase or contact your admin.`,
		});
	}
};

export const getAllQuotas = async () => {
	const quotas = await db.query.organizationQuota.findMany({
		with: {
			organization: true,
		},
	});

	const result = [];
	for (const quota of quotas) {
		const usage = await getUsage(quota.organizationId);
		result.push({
			...quota,
			usage,
		});
	}

	return result;
};
