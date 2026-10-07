ALTER TABLE "journeys" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "journeys" ADD COLUMN "invite_code" text;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_invite_code_unique" UNIQUE("invite_code");