UPDATE "campaigns" SET "brief" = jsonb_build_object(
	'opening', '',
	'setting', COALESCE("brief"->>'setting', ''),
	'culture', '',
	'politics', '',
	'tone', COALESCE("brief"->>'tone', ''),
	'localTheme', '',
	'hook', COALESCE("brief"->>'hook', ''),
	'problem', COALESCE("brief"->>'objective', ''),
	'escalation', '',
	'complications', '[]'::jsonb,
	'npcs', COALESCE(
		(
			SELECT jsonb_agg("npc" || jsonb_build_object('description', ''))
			FROM jsonb_array_elements("brief"->'npcs') AS "npc"
		),
		'[]'::jsonb
	)
);
