import { db } from "@dokploy/server/db";
import { forwardAuthSettings, ssoProvider } from "@dokploy/server/db/schema";
import {
	apiDeployForwardAuthOnServer,
	apiSetForwardAuthSettings,
} from "@dokploy/server/db/schema/forward-auth";
import {
	deriveBaseDomain,
	deriveCookieSecret,
	forwardAuthCallbackUrl,
	isForwardAuthRunning,
	removeForwardAuth,
	setupForwardAuth,
} from "@dokploy/server/setup/forward-auth-setup";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import { audit } from "@/server/api/utils/audit";

export const forwardAuthRouter = createTRPCRouter({
	status: protectedProcedure
		.input(z.object({ serverId: z.string().nullable() }))
		.query(async ({ input }) => {
			const running = await isForwardAuthRunning(
				input.serverId ?? undefined,
			);
			const settings = await db.query.forwardAuthSettings.findFirst({
				where: input.serverId
					? eq(forwardAuthSettings.serverId, input.serverId)
					: isNull(forwardAuthSettings.serverId),
			});
			return {
				running,
				settings: settings ?? null,
			};
		}),

	getSettings: adminProcedure
		.input(z.object({ serverId: z.string().nullable() }))
		.query(async ({ input }) => {
			return (
				(await db.query.forwardAuthSettings.findFirst({
					where: input.serverId
						? eq(forwardAuthSettings.serverId, input.serverId)
						: isNull(forwardAuthSettings.serverId),
				})) ?? null
			);
		}),

	configure: adminProcedure
		.input(apiSetForwardAuthSettings)
		.mutation(async ({ input, ctx }) => {
			const existing = await db.query.forwardAuthSettings.findFirst({
				where: input.serverId
					? eq(forwardAuthSettings.serverId, input.serverId)
					: isNull(forwardAuthSettings.serverId),
			});

			const baseDomain = deriveBaseDomain(input.authDomain);

			if (existing) {
				await db
					.update(forwardAuthSettings)
					.set({
						authDomain: input.authDomain,
						baseDomain,
						https: input.https,
						certificateType: input.certificateType,
						customCertResolver: input.customCertResolver,
					})
					.where(
						eq(forwardAuthSettings.forwardAuthSettingsId, existing.forwardAuthSettingsId),
					);
			} else {
				await db.insert(forwardAuthSettings).values({
					authDomain: input.authDomain,
					baseDomain,
					https: input.https,
					certificateType: input.certificateType,
					customCertResolver: input.customCertResolver,
					serverId: input.serverId,
				});
			}

			await audit(ctx, {
				action: "update",
				resourceType: "settings",
				resourceName: `forward-auth-config:${input.serverId ?? "local"}`,
			});

			return { success: true };
		}),

	deploy: adminProcedure
		.input(apiDeployForwardAuthOnServer)
		.mutation(async ({ input, ctx }) => {
			const settings = await db.query.forwardAuthSettings.findFirst({
				where: input.serverId
					? eq(forwardAuthSettings.serverId, input.serverId)
					: isNull(forwardAuthSettings.serverId),
			});

			if (!settings) {
				throw new Error(
					"Forward auth settings not configured. Configure the auth domain first.",
				);
			}

			const provider = await db.query.ssoProvider.findFirst({
				where: eq(ssoProvider.providerId, input.providerId),
			});

			if (!provider) {
				throw new Error("SSO provider not found");
			}

			if (!provider.oidcConfig) {
				throw new Error("SSO provider does not have OIDC configuration");
			}

			const oidcConfig = JSON.parse(provider.oidcConfig);
			const cookieSecret = deriveCookieSecret(
				settings.forwardAuthSettingsId,
			);

			await setupForwardAuth({
				serverId: input.serverId ?? undefined,
				oidc: {
					clientId: oidcConfig.clientId,
					clientSecret: oidcConfig.clientSecret,
					issuer: provider.issuer,
					scopes: oidcConfig.scopes,
				},
				cookieSecret,
				authDomain: settings.authDomain,
				baseDomain: settings.baseDomain,
				authDomainHttps: settings.https,
			});

			await db
				.update(forwardAuthSettings)
				.set({ providerId: input.providerId })
				.where(
					eq(forwardAuthSettings.forwardAuthSettingsId, settings.forwardAuthSettingsId),
				);

			await audit(ctx, {
				action: "deploy",
				resourceType: "settings",
				resourceName: `forward-auth:${input.serverId ?? "local"}`,
			});

			return { success: true };
		}),

	remove: adminProcedure
		.input(z.object({ serverId: z.string().nullable() }))
		.mutation(async ({ input, ctx }) => {
			await removeForwardAuth(input.serverId ?? undefined);

			await db
				.delete(forwardAuthSettings)
				.where(
					input.serverId
						? eq(forwardAuthSettings.serverId, input.serverId)
						: isNull(forwardAuthSettings.serverId),
				);

			await audit(ctx, {
				action: "delete",
				resourceType: "settings",
				resourceName: `forward-auth:${input.serverId ?? "local"}`,
			});

			return { success: true };
		}),
});
