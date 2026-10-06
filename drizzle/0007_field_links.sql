ALTER TABLE "links" DROP CONSTRAINT "links_source_id_field_id_row_id_column_id_target_id_unique";--> statement-breakpoint
ALTER TABLE "links" ALTER COLUMN "row_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ALTER COLUMN "column_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_source_id_field_id_row_id_column_id_target_id_unique" UNIQUE NULLS NOT DISTINCT("source_id","field_id","row_id","column_id","target_id");