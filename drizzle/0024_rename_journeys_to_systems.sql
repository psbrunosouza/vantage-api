ALTER INDEX "structure_tags_system_slug_unique" RENAME TO "structure_tags_global_slug_unique";
--> statement-breakpoint
ALTER INDEX "field_tags_system_slug_unique" RENAME TO "field_tags_global_slug_unique";
--> statement-breakpoint
ALTER TABLE "journeys" RENAME TO "systems";
--> statement-breakpoint
ALTER TABLE "journey_members" RENAME TO "system_members";
--> statement-breakpoint
ALTER TABLE "campaigns" RENAME COLUMN "journey_id" TO "system_id";
--> statement-breakpoint
ALTER TABLE "system_members" RENAME COLUMN "journey_id" TO "system_id";
--> statement-breakpoint
ALTER TABLE "member_resources" RENAME COLUMN "journey_id" TO "system_id";
--> statement-breakpoint
ALTER TABLE "play_sessions" RENAME COLUMN "journey_id" TO "system_id";
--> statement-breakpoint
ALTER TABLE "session_folders" RENAME COLUMN "journey_id" TO "system_id";
--> statement-breakpoint
ALTER TABLE "session_zero_questions" RENAME COLUMN "journey_id" TO "system_id";
--> statement-breakpoint
ALTER TABLE "structures" RENAME COLUMN "journey_id" TO "system_id";
--> statement-breakpoint
ALTER TABLE "field_tags" RENAME COLUMN "journey_id" TO "system_id";
--> statement-breakpoint
ALTER TABLE "structure_tags" RENAME COLUMN "journey_id" TO "system_id";
--> statement-breakpoint
ALTER TABLE "campaigns" RENAME CONSTRAINT "campaigns_journey_id_journeys_id_fk" TO "campaigns_system_id_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "campaigns" RENAME CONSTRAINT "campaigns_journey_id_unique" TO "campaigns_system_id_unique";
--> statement-breakpoint
ALTER TABLE "system_members" RENAME CONSTRAINT "journey_members_journey_id_journeys_id_fk" TO "system_members_system_id_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "system_members" RENAME CONSTRAINT "journey_members_user_id_users_id_fk" TO "system_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "system_members" RENAME CONSTRAINT "journey_members_journey_id_user_id_pk" TO "system_members_system_id_user_id_pk";
--> statement-breakpoint
ALTER TABLE "systems" RENAME CONSTRAINT "journeys_owner_id_users_id_fk" TO "systems_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "systems" RENAME CONSTRAINT "journeys_narrator_id_users_id_fk" TO "systems_narrator_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "systems" RENAME CONSTRAINT "journeys_invite_code_unique" TO "systems_invite_code_unique";
--> statement-breakpoint
ALTER TABLE "play_sessions" RENAME CONSTRAINT "play_sessions_journey_id_journeys_id_fk" TO "play_sessions_system_id_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "session_folders" RENAME CONSTRAINT "session_folders_journey_id_journeys_id_fk" TO "session_folders_system_id_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "session_zero_questions" RENAME CONSTRAINT "session_zero_questions_journey_id_journeys_id_fk" TO "session_zero_questions_system_id_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "structures" RENAME CONSTRAINT "structures_journey_id_journeys_id_fk" TO "structures_system_id_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "field_tags" RENAME CONSTRAINT "field_tags_journey_id_journeys_id_fk" TO "field_tags_system_id_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "structure_tags" RENAME CONSTRAINT "structure_tags_journey_id_journeys_id_fk" TO "structure_tags_system_id_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "system_drafts" RENAME CONSTRAINT "system_drafts_system_id_journeys_id_fk" TO "system_drafts_system_id_systems_id_fk";
--> statement-breakpoint
ALTER INDEX "structure_tags_journey_slug_unique" RENAME TO "structure_tags_system_slug_unique";
--> statement-breakpoint
ALTER INDEX "field_tags_journey_slug_unique" RENAME TO "field_tags_system_slug_unique";
--> statement-breakpoint
ALTER INDEX "journeys_owner_id_index" RENAME TO "systems_owner_id_index";
--> statement-breakpoint
ALTER INDEX "journey_members_user_id_index" RENAME TO "system_members_user_id_index";
--> statement-breakpoint
ALTER INDEX "member_resources_journey_id_user_id_index" RENAME TO "member_resources_system_id_user_id_index";
--> statement-breakpoint
ALTER INDEX "play_sessions_journey_id_index" RENAME TO "play_sessions_system_id_index";
--> statement-breakpoint
ALTER INDEX "session_folders_journey_id_index" RENAME TO "session_folders_system_id_index";
--> statement-breakpoint
ALTER INDEX "session_zero_questions_journey_id_position_index" RENAME TO "session_zero_questions_system_id_position_index";
--> statement-breakpoint
ALTER INDEX "structures_journey_id_index" RENAME TO "structures_system_id_index";
--> statement-breakpoint
ALTER INDEX "field_tags_journey_id_index" RENAME TO "field_tags_system_id_index";
--> statement-breakpoint
ALTER INDEX "structure_tags_journey_id_index" RENAME TO "structure_tags_system_id_index";
