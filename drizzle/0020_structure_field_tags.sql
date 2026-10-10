CREATE TABLE "field_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "structure_tag_links" (
	"structure_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "structure_tag_links_structure_id_tag_id_pk" PRIMARY KEY("structure_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "structure_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "structures" ADD COLUMN "ai_note" text;--> statement-breakpoint
ALTER TABLE "field_tags" ADD CONSTRAINT "field_tags_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "structure_tag_links" ADD CONSTRAINT "structure_tag_links_structure_id_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."structures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "structure_tag_links" ADD CONSTRAINT "structure_tag_links_tag_id_structure_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."structure_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "structure_tags" ADD CONSTRAINT "structure_tags_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "field_tags_journey_id_index" ON "field_tags" USING btree ("journey_id");--> statement-breakpoint
CREATE UNIQUE INDEX "field_tags_journey_slug_unique" ON "field_tags" USING btree ("journey_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "field_tags_system_slug_unique" ON "field_tags" USING btree ("slug") WHERE "field_tags"."journey_id" is null;--> statement-breakpoint
CREATE INDEX "structure_tag_links_tag_id_index" ON "structure_tag_links" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "structure_tags_journey_id_index" ON "structure_tags" USING btree ("journey_id");--> statement-breakpoint
CREATE UNIQUE INDEX "structure_tags_journey_slug_unique" ON "structure_tags" USING btree ("journey_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "structure_tags_system_slug_unique" ON "structure_tags" USING btree ("slug") WHERE "structure_tags"."journey_id" is null;--> statement-breakpoint
INSERT INTO "structure_tags" ("slug", "name", "description") VALUES
('atores', 'Atores', 'Anything playable or alive in the story: player characters, NPCs and creatures that act, speak and decide.'),
('grupos', 'Grupos', 'Collectives of actors: crews, factions, guilds, families and organizations.'),
('documentos', 'Documentos', 'Written or recorded information: letters, maps, journals, contracts and clues.'),
('locais', 'Locais', 'Places the story can visit: cities, ships, dungeons, rooms and regions.'),
('itens', 'Itens', 'Objects that can be carried, used, traded or found: weapons, tools, relics and treasure.');--> statement-breakpoint
INSERT INTO "field_tags" ("slug", "name", "description") VALUES
('titulo', 'Título', 'The title or epithet of the sheet, such as a rank, nickname or role.'),
('classe', 'Classe', 'The class, archetype or profession that defines how the sheet acts.'),
('pressao', 'Pressão', 'A meter of stress, danger or tension that rises as the story goes badly.'),
('vida', 'Vida', 'Health or vitality that drops with harm and ends the sheet at zero.'),
('descricao', 'Descrição', 'A free description of what the sheet is, looks like or has done.'),
('motivacao', 'Motivação', 'What drives the sheet: a goal, desire or fear that shapes its choices.');--> statement-breakpoint
INSERT INTO "structure_tag_links" ("structure_id", "tag_id") SELECT "structures"."id", "structure_tags"."id" FROM "structures", "structure_tags" WHERE "structures"."capability" = 'actor' AND "structure_tags"."slug" = 'atores' AND "structure_tags"."journey_id" IS NULL;
