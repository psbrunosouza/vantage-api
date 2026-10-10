CREATE TABLE "session_zero_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"prompt" text NOT NULL,
	"kind" text NOT NULL,
	"structure_id" uuid,
	"field_id" text,
	"source_structure_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_zero_questions" ADD CONSTRAINT "session_zero_questions_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_zero_questions" ADD CONSTRAINT "session_zero_questions_structure_id_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."structures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_zero_questions" ADD CONSTRAINT "session_zero_questions_source_structure_id_structures_id_fk" FOREIGN KEY ("source_structure_id") REFERENCES "public"."structures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_zero_questions_journey_id_position_index" ON "session_zero_questions" USING btree ("journey_id","position");