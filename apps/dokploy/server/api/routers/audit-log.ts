import { db } from "@dokploy/server/db";
import { auditLog } from "@dokploy/server/db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";

export const auditLogRouter = createTRPCRouter({
	list: adminProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(50),
				cursor: z.string().nullish(),
				action: z.string().optional(),
				resourceType: z.string().optional(),
				userId: z.string().optional(),
				from: z.string().datetime().optional(),
				to: z.string().datetime().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const conditions = [
				eq(auditLog.organizationId, ctx.session.activeOrganizationId),
			];

			if (input.action) {
				conditions.push(eq(auditLog.action, input.action));
			}
			if (input.resourceType) {
				conditions.push(eq(auditLog.resourceType, input.resourceType));
			}
			if (input.userId) {
				conditions.push(eq(auditLog.userId, input.userId));
			}
			if (input.from) {
				conditions.push(gte(auditLog.createdAt, new Date(input.from)));
			}
			if (input.to) {
				conditions.push(lte(auditLog.createdAt, new Date(input.to)));
			}
			if (input.cursor) {
				conditions.push(lte(auditLog.id, input.cursor));
			}

			const items = await db.query.auditLog.findMany({
				where: and(...conditions),
				orderBy: [desc(auditLog.createdAt), desc(auditLog.id)],
				limit: input.limit + 1,
			});

			let nextCursor: string | undefined;
			if (items.length > input.limit) {
				const nextItem = items.pop();
				nextCursor = nextItem?.id;
			}

			return { items, nextCursor };
		}),

	stats: adminProcedure
		.input(
			z.object({
				days: z.number().min(1).max(90).default(7),
			}),
		)
		.query(async ({ input, ctx }) => {
			const from = new Date();
			from.setDate(from.getDate() - input.days);

			const result = await db
				.select({
					action: auditLog.action,
					count: sql<number>`count(*)::int`,
				})
				.from(auditLog)
				.where(
					and(
						eq(auditLog.organizationId, ctx.session.activeOrganizationId),
						gte(auditLog.createdAt, from),
					),
				)
				.groupBy(auditLog.action);

			return result;
		}),
});
