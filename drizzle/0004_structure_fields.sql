ALTER TABLE "structures" RENAME COLUMN "pieces" TO "fields";--> statement-breakpoint
UPDATE "structures" SET "fields" = (
	SELECT coalesce(jsonb_agg(
		CASE WHEN "field" ? 'pieceId'
			THEN ("field" - 'pieceId') || jsonb_build_object('type', "field" -> 'pieceId')
			ELSE "field"
		END
		ORDER BY "position"
	), '[]'::jsonb)
	FROM jsonb_array_elements("structures"."fields") WITH ORDINALITY AS "entry"("field", "position")
);
