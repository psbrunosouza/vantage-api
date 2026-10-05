CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"field_id" text NOT NULL,
	"row_id" text NOT NULL,
	"column_id" text NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_source_id_field_id_row_id_column_id_target_id_unique" UNIQUE("source_id","field_id","row_id","column_id","target_id")
);
--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_source_id_resources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_target_id_resources_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "links_target_id_index" ON "links" USING btree ("target_id");