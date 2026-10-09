CREATE TABLE "catalog_species" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_species_themes" (
	"species_id" integer NOT NULL,
	"theme_id" integer NOT NULL,
	CONSTRAINT "catalog_species_themes_species_id_theme_id_pk" PRIMARY KEY("species_id","theme_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_themes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "catalog_themes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "catalog_themes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "catalog_species_themes" ADD CONSTRAINT "catalog_species_themes_species_id_catalog_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."catalog_species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_species_themes" ADD CONSTRAINT "catalog_species_themes_theme_id_catalog_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."catalog_themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_species_themes_theme_id_index" ON "catalog_species_themes" USING btree ("theme_id");