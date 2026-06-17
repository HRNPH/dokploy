import { db } from "@dokploy/server/db";
import { auditLog } from "@dokploy/server/db/schema";
import type { AuditAction, AuditResourceType } from "@dokploy/server/db/schema";
import { nanoid } from "nanoid";

interface AuditCtx {
	user: { id: string; email: string; role: string };
	session: { activeOrganizationId: string };
}

interface AuditEvent {
	action: AuditAction;
	resourceType: AuditResourceType;
	resourceId?: string;
	resourceName?: string;
	metadata?: Record<string, unknown>;
}

export const audit = async (ctx: AuditCtx, event: AuditEvent) => {
	try {
		await db.insert(auditLog).values({
			id: nanoid(),
			organizationId: ctx.session.activeOrganizationId,
			userId: ctx.user.id,
			userEmail: ctx.user.email,
			userRole: ctx.user.role,
			action: event.action,
			resourceType: event.resourceType,
			resourceId: event.resourceId,
			resourceName: event.resourceName,
			metadata: event.metadata ? JSON.stringify(event.metadata) : null,
		});
	} catch (error) {
		console.error("Failed to create audit log:", error);
	}
};
