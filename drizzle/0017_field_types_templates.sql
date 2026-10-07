CREATE TABLE "field_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"description" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_categories" (
	"template_id" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	CONSTRAINT "template_categories_template_id_position_pk" PRIMARY KEY("template_id","position")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"icon" text NOT NULL,
	"color" text,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_categories" ADD CONSTRAINT "template_categories_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;