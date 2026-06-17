import { db } from "@dokploy/server/db";
import { ssoProvider } from "@dokploy/server/db/schema";
import { ssoProviderBodySchema } from "@dokploy/server/db/schema";
import { auth } from "@dokploy/server/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { audit } from "@/server/api/utils/audit";

export const ssoRouter = createTRPCRouter({
	showSignInWithSSO: publicProcedure.query(async () => {
		const providers = await db.query.ssoProvider.findMany({
			limit: 1,
		});
		return providers.length > 0;
	}),

	listProviders: adminProcedure.query(async ({ ctx }) => {
		return await db.query.ssoProvider.findMany({
			where: eq(ssoProvider.organizationId, ctx.session.activeOrganizationId),
			orderBy: (t, { desc }) => [desc(t.createdAt)],
		});
	}),

	one: adminProcedure
		.input(z.object({ providerId: z.string() }))
		.query(async ({ input }) => {
			const provider = await db.query.ssoProvider.findFirst({
				where: eq(ssoProvider.providerId, input.providerId),
			});
			if (!provider) {
				throw new Error("SSO provider not found");
			}
			return provider;
		}),

	register: adminProcedure
		.input(ssoProviderBodySchema)
		.mutation(async ({ input, ctx }) => {
			const result = await auth.registerSSOProvider({
				body: {
					...input,
					organizationId: ctx.session.activeOrganizationId,
				},
				headers: ctx.req.headers as any,
			});

			if (result.error) {
				throw new Error(result.error.message || "Failed to register SSO provider");
			}

			await audit(ctx, {
				action: "create",
				resourceType: "settings",
				resourceName: `sso-provider:${input.providerId}`,
			});

			return result.data;
		}),

	update: adminProcedure
		.input(
			z.object({
				providerId: z.string(),
				body: ssoProviderBodySchema.partial(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const result = await auth.updateSSOProvider({
				body: {
					providerId: input.providerId,
					...input.body,
				},
				headers: ctx.req.headers as any,
			});

			if (result.error) {
				throw new Error(result.error.message || "Failed to update SSO provider");
			}

			await audit(ctx, {
				action: "update",
				resourceType: "settings",
				resourceName: `sso-provider:${input.providerId}`,
			});

			return result.data;
		}),

	deleteProvider: adminProcedure
		.input(z.object({ providerId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			await db
				.delete(ssoProvider)
				.where(eq(ssoProvider.providerId, input.providerId));

			await audit(ctx, {
				action: "delete",
				resourceType: "settings",
				resourceName: `sso-provider:${input.providerId}`,
			});

			return { success: true };
		}),
});
