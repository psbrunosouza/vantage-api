ALTER TABLE "session_zero_questions" DROP CONSTRAINT "session_zero_questions_structure_id_structures_id_fk";
--> statement-breakpoint
ALTER TABLE "session_zero_questions" DROP CONSTRAINT "session_zero_questions_source_structure_id_structures_id_fk";
--> statement-breakpoint
ALTER TABLE "session_zero_questions" ADD COLUMN "format" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "session_zero_questions" ADD COLUMN "options" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "session_zero_questions" ADD COLUMN "min" integer;--> statement-breakpoint
ALTER TABLE "session_zero_questions" ADD COLUMN "max" integer;--> statement-breakpoint
ALTER TABLE "session_zero_questions" ADD COLUMN "reword" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "session_zero_questions" SET "format" = 'single', "options" = (SELECT jsonb_agg("key") FROM jsonb_object_keys("details") AS "key") WHERE (SELECT count(*) FROM jsonb_object_keys("details")) >= 2;--> statement-breakpoint
ALTER TABLE "session_zero_questions" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "session_zero_questions" DROP COLUMN "structure_id";--> statement-breakpoint
ALTER TABLE "session_zero_questions" DROP COLUMN "field_id";--> statement-breakpoint
ALTER TABLE "session_zero_questions" DROP COLUMN "source_structure_id";
