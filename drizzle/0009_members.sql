CREATE TABLE "member_resources" (
	"resource_id" uuid PRIMARY KEY NOT NULL,
	"journey_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journey_members" ADD COLUMN "color" text;--> statement-breakpoint
UPDATE "journey_members" SET "color" = (ARRAY['royal','violet','orchid','rose','ember','amber','emerald','cyan'])[floor(random() * 8 + 1)::int];--> statement-breakpoint
INSERT INTO "journey_members" ("journey_id", "user_id", "color") SELECT "id", "owner_id", (ARRAY['royal','violet','orchid','rose','ember','amber','emerald','cyan'])[floor(random() * 8 + 1)::int] FROM "journeys" ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "journey_members" ALTER COLUMN "color" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "journeys" ADD COLUMN "narrator_id" uuid;--> statement-breakpoint
UPDATE "journeys" SET "narrator_id" = "owner_id";--> statement-breakpoint
ALTER TABLE "member_resources" ADD CONSTRAINT "member_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_resources" ADD CONSTRAINT "member_resources_member_fk" FOREIGN KEY ("journey_id","user_id") REFERENCES "public"."journey_members"("journey_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_resources_journey_id_user_id_index" ON "member_resources" USING btree ("journey_id","user_id");--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_narrator_id_users_id_fk" FOREIGN KEY ("narrator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;