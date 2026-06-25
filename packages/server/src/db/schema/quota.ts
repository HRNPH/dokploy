import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { organization } from "./account";

export const organizationQuota = pgTable("organization_quota", {
	quotaId: text("quotaId")
		.notNull()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	organizationId: text("organization_id")
		.notNull()
		.unique()
		.references(() => organization.id, { onDelete: "cascade" }),
	// Resource limits
	maxProjects: integer("maxProjects").notNull().default(10),
	maxServices: integer("maxServices").notNull().default(20),
	maxServers: integer("maxServers").notNull().default(3),
	maxMembers: integer("maxMembers").notNull().default(5),
	maxCpu: integer("maxCpu").notNull().default(4), // cores
	maxRam: integer("maxRam").notNull().default(8), // GB
	maxDisk: integer("maxDisk").notNull().default(50), // GB
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const organizationQuotaRelations = relations(
	organizationQuota,
	({ one }) => ({
		organization: one(organization, {
			fields: [organizationQuota.organizationId],
			references: [organization.id],
		}),
	}),
);

export const quotaIncreaseRequest = pgTable("quota_increase_request", {
	requestId: text("requestId")
		.notNull()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull(),
	resource: text("resource").notNull(), // "projects", "services", "servers", "members", "cpu", "ram", "disk"
	currentValue: integer("current_value").notNull(),
	requestedValue: integer("requested_value").notNull(),
	reason: text("reason"),
	status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
	reviewedBy: text("reviewed_by"),
	reviewedAt: timestamp("reviewed_at"),
	reviewNote: text("review_note"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiSetQuota = z.object({
	organizationId: z.string(),
	maxProjects: z.number().min(0).optional(),
	maxServices: z.number().min(0).optional(),
	maxServers: z.number().min(0).optional(),
	maxMembers: z.number().min(0).optional(),
	maxCpu: z.number().min(0).optional(),
	maxRam: z.number().min(0).optional(),
	maxDisk: z.number().min(0).optional(),
});

export const apiRequestQuotaIncrease = z.object({
	resource: z.enum(["projects", "services", "servers", "members", "cpu", "ram", "disk"]),
	requestedValue: z.number().min(1),
	reason: z.string().optional(),
});

export type QuotaIncreaseRequest = typeof quotaIncreaseRequest.$inferSelect;
export type OrganizationQuota = typeof organizationQuota.$inferSelect;
