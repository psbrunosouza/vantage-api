DELETE FROM "worlds";
--> statement-breakpoint
UPDATE "system_drafts" SET "system" = "system" - 'profile' WHERE "system" ? 'profile';
--> statement-breakpoint
UPDATE "system_drafts"
SET "options" = (
  SELECT jsonb_agg(jsonb_set(item, '{option}', (item -> 'option') - 'profile') ORDER BY position)
  FROM jsonb_array_elements("options") WITH ORDINALITY AS entries(item, position)
)
WHERE jsonb_typeof("options") = 'array' AND jsonb_array_length("options") > 0;
--> statement-breakpoint
UPDATE "system_drafts"
SET "progress" = jsonb_set("progress", '{campaign}', ("progress" -> 'campaign') - 'profile')
WHERE jsonb_typeof("progress" -> 'campaign') = 'object';
