CREATE TABLE "organization_quota" (
	"quotaId" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL UNIQUE,
	"maxProjects" integer DEFAULT 10 NOT NULL,
	"maxServices" integer DEFAULT 20 NOT NULL,
	"maxServers" integer DEFAULT 3 NOT NULL,
	"maxMembers" integer DEFAULT 5 NOT NULL,
	"maxCpu" integer DEFAULT 4 NOT NULL,
	"maxRam" integer DEFAULT 8 NOT NULL,
	"maxDisk" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quota_increase_request" (
	"requestId" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"resource" text NOT NULL,
	"current_value" integer NOT NULL,
	"requested_value" integer NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_quota" ADD CONSTRAINT "organization_quota_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_increase_request" ADD CONSTRAINT "quota_increase_request_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
