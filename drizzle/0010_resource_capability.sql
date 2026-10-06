ALTER TABLE "resources" ADD COLUMN "capability" text;--> statement-breakpoint
UPDATE "resources" SET "capability" = 'actor' WHERE "id" IN (SELECT "resource_id" FROM "member_resources");
