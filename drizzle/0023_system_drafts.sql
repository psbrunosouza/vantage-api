CREATE TABLE "system_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"system_id" uuid,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"system" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"structure_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"field_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"structures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hooks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"character" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_drafts" ADD CONSTRAINT "system_drafts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_drafts" ADD CONSTRAINT "system_drafts_system_id_journeys_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."journeys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "system_drafts_owner_id_status_index" ON "system_drafts" USING btree ("owner_id","status");