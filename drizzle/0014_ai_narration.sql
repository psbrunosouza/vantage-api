CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"title" text NOT NULL,
	"premise" text NOT NULL,
	"brief" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_journey_id_unique" UNIQUE("journey_id")
);
--> statement-breakpoint
ALTER TABLE "journeys" ADD COLUMN "ai_narrator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "session_entries" ADD COLUMN "source" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;