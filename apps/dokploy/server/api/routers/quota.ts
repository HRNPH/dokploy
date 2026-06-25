import { db } from "@dokploy/server/db";
import { organizationQuota, quotaIncreaseRequest } from "@dokploy/server/db/schema";
import {
	apiRequestQuotaIncrease,
	apiSetQuota,
} from "@dokploy/server/db/schema/quota";
import { findOrganizationById } from "@dokploy/server/services/admin";
import {
	getAllQuotas,
	getOrCreateQuota,
	getUsage,
	setQuota,
} from "@dokploy/server/services/quota";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import { audit } from "@/server/api/utils/audit";

export const quotaRouter = createTRPCRouter({
	get: protectedProcedure.query(async ({ ctx }) => {
		const quota = await getOrCreateQuota(ctx.session.activeOrganizationId);
		const usage = await getUsage(ctx.session.activeOrganizationId);
		return { quota, usage };
	}),

	getAll: adminProcedure.query(async ({ ctx }) => {
		// Only the organization owner can see all quotas
		const org = await findOrganizationById(ctx.session.activeOrganizationId);
		if (org.ownerId !== ctx.user.id) {
			// Check if user is the very first owner (super admin)
			const firstMember = await db.query.member.findFirst({
				where: eq(member.role, "owner"),
				orderBy: (t, { asc }) => [asc(t.createdAt)],
			});
			if (firstMember?.userId !== ctx.user.id) {
				return [];
			}
		}
		return await getAllQuotas();
	}),

	set: adminProcedure.input(apiSetQuota).mutation(async ({ input, ctx }) => {
		const { organizationId, ...updates } = input;

		// Verify caller has permission
		const org = await findOrganizationById(organizationId);
		if (org.ownerId !== ctx.user.id) {
			const firstMember = await db.query.member.findFirst({
				where: eq(member.role, "owner"),
				orderBy: (t, { asc }) => [asc(t.createdAt)],
			});
			if (firstMember?.userId !== ctx.user.id) {
				throw new Error("Only the super admin can set quotas for other organizations");
			}
		}

		const quota = await setQuota(organizationId, updates);

		await audit(ctx, {
			action: "update",
			resourceType: "organization",
			resourceId: organizationId,
			resourceName: `quota:${organizationId}`,
			metadata: updates,
		});

		return quota;
	}),

	requestIncrease: protectedProcedure
		.input(apiRequestQuotaIncrease)
		.mutation(async ({ input, ctx }) => {
			const quota = await getOrCreateQuota(ctx.session.activeOrganizationId);
			const usage = await getUsage(ctx.session.activeOrganizationId);

			const currentMap: Record<string, number> = {
				projects: usage.projects,
				services: usage.services,
				servers: usage.servers,
				members: usage.members,
				cpu: quota.maxCpu,
				ram: quota.maxRam,
				disk: quota.maxDisk,
			};

			const currentValue = currentMap[input.resource] ?? 0;

			const [request] = await db
				.insert(quotaIncreaseRequest)
				.values({
					organizationId: ctx.session.activeOrganizationId,
					userId: ctx.user.id,
					resource: input.resource,
					currentValue,
					requestedValue: input.requestedValue,
					reason: input.reason,
				})
				.returning();

			return request;
		}),

	getRequests: adminProcedure
		.input(z.object({ status: z.string().optional() }).optional())
		.query(async ({ input, ctx }) => {
			const conditions = [];
			if (input?.status) {
				conditions.push(eq(quotaIncreaseRequest.status, input.status));
			}

			return await db.query.quotaIncreaseRequest.findMany({
				where: conditions.length > 0 ? and(...conditions) : undefined,
				orderBy: [desc(quotaIncreaseRequest.createdAt)],
			});
		}),

	reviewRequest: adminProcedure
		.input(
			z.object({
				requestId: z.string(),
				status: z.enum(["approved", "rejected"]),
				reviewNote: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const request = await db.query.quotaIncreaseRequest.findFirst({
				where: eq(quotaIncreaseRequest.requestId, input.requestId),
			});

			if (!request) {
				throw new Error("Request not found");
			}

			// Update request status
			await db
				.update(quotaIncreaseRequest)
				.set({
					status: input.status,
					reviewedBy: ctx.user.id,
					reviewedAt: new Date(),
					reviewNote: input.reviewNote,
				})
				.where(
					eq(quotaIncreaseRequest.requestId, input.requestId),
				);

			// If approved, update the quota
			if (input.status === "approved") {
				const resourceQuotaMap: Record<string, string> = {
					projects: "maxProjects",
					services: "maxServices",
					servers: "maxServers",
					members: "maxMembers",
					cpu: "maxCpu",
					ram: "maxRam",
					disk: "maxDisk",
				};

				const quotaField = resourceQuotaMap[request.resource];
				if (quotaField) {
					await setQuota(request.organizationId, {
						[quotaField]: request.requestedValue,
					});
				}
			}

			await audit(ctx, {
				action: "update",
				resourceType: "organization",
				resourceId: request.organizationId,
				resourceName: `quota-request:${input.status}`,
			});

			return { success: true };
		}),
});
