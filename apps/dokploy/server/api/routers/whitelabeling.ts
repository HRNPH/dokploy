import {
	getWebServerSettings,
	updateWebServerSettings,
} from "@dokploy/server/services/web-server-settings";
import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { audit } from "@/server/api/utils/audit";
import { whitelabelingConfigSchema } from "@/server/db/schema";

export const whitelabelingRouter = createTRPCRouter({
	get: protectedProcedure.query(async () => {
		const settings = await getWebServerSettings();
		return settings?.whitelabelingConfig ?? null;
	}),

	getPublic: publicProcedure.query(async () => {
		const settings = await getWebServerSettings();
		return settings?.whitelabelingConfig ?? null;
	}),

	update: adminProcedure
		.input(z.object({ whitelabelingConfig: whitelabelingConfigSchema }))
		.mutation(async ({ input, ctx }) => {
			await updateWebServerSettings({
				whitelabelingConfig: input.whitelabelingConfig,
			});

			await audit(ctx, {
				action: "update",
				resourceType: "settings",
				resourceName: "whitelabeling",
			});

			return { success: true };
		}),

	reset: adminProcedure.mutation(async ({ ctx }) => {
		await updateWebServerSettings({
			whitelabelingConfig: {
				appName: null,
				appDescription: null,
				logoUrl: null,
				faviconUrl: null,
				customCss: null,
				loginLogoUrl: null,
				supportUrl: null,
				docsUrl: null,
				errorPageTitle: null,
				errorPageDescription: null,
				metaTitle: null,
				footerText: null,
			},
		});

		await audit(ctx, {
			action: "update",
			resourceType: "settings",
			resourceName: "whitelabeling-reset",
		});

		return { success: true };
	}),
});
