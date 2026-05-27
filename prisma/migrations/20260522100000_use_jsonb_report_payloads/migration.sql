-- Convert legacy stringified payload columns to JSONB with safe array fallbacks.
-- Malformed or non-array legacy values are replaced with [] because they cannot
-- be reconstructed into the structured array contract expected by the backend.

CREATE OR REPLACE FUNCTION "parse_jsonb_array_or_empty"(value TEXT)
RETURNS JSONB AS $$
DECLARE
  parsed JSONB;
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN '[]'::jsonb;
  END IF;

  BEGIN
    parsed := value::jsonb;
  EXCEPTION
    WHEN others THEN
      RETURN '[]'::jsonb;
  END;

  IF jsonb_typeof(parsed) = 'array' THEN
    RETURN parsed;
  END IF;

  RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE "Spec"
  ALTER COLUMN "tags" DROP DEFAULT,
  ALTER COLUMN "tags" TYPE JSONB USING "parse_jsonb_array_or_empty"("tags"),
  ALTER COLUMN "tags" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "annotations" DROP DEFAULT,
  ALTER COLUMN "annotations" TYPE JSONB USING "parse_jsonb_array_or_empty"("annotations"),
  ALTER COLUMN "annotations" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "annotations" SET NOT NULL;

ALTER TABLE "ResultError"
  ALTER COLUMN "callLog" TYPE JSONB USING CASE
    WHEN "callLog" IS NULL THEN NULL
    ELSE "parse_jsonb_array_or_empty"("callLog")
  END,
  ALTER COLUMN "callStack" TYPE JSONB USING "parse_jsonb_array_or_empty"("callStack");

DROP FUNCTION "parse_jsonb_array_or_empty"(TEXT);
