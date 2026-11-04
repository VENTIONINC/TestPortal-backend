-- Establish the current-credential invariant for existing accounts.
UPDATE "User"
SET "mcpToken" = NULL
WHERE "status" IN ('pending', 'suspended') OR "mcpToken" = '';
