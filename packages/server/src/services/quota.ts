import { db } from "@dokploy/server/db";
import {
	applications,
	compose,
	environments,
	member,
	organizationQuota,
	projects,
	server,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";

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
	// Count projects directly
	const projectCount = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(projects)
		.where(eq(projects.organizationId, organizationId))
		.then((r) => r[0]?.count ?? 0);

	// Count applications through environment -> project
	const appCount = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(applications)
		.innerJoin(environments, eq(applications.environmentId, environments.environmentId))
		.innerJoin(projects, eq(environments.projectId, projects.projectId))
		.where(eq(projects.organizationId, organizationId))
		.then((r) => r[0]?.count ?? 0);

	// Count compose services through environment -> project
	const composeCount = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(compose)
		.innerJoin(environments, eq(compose.environmentId, environments.environmentId))
		.innerJoin(projects, eq(environments.projectId, projects.projectId))
		.where(eq(projects.organizationId, organizationId))
		.then((r) => r[0]?.count ?? 0);

	// Count servers directly
	const serverCount = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(server)
		.where(eq(server.organizationId, organizationId))
		.then((r) => r[0]?.count ?? 0);

	// Count members directly
	const memberCount = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(member)
		.where(eq(member.organizationId, organizationId))
		.then((r) => r[0]?.count ?? 0);

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
		projects: quota?.maxProjects ?? 10,
		services: quota?.maxServices ?? 20,
		servers: quota?.maxServers ?? 3,
		members: quota?.maxMembers ?? 5,
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
