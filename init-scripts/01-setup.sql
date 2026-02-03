-- Ensure the test_portal database exists
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'test_portal') THEN
		CREATE DATABASE test_portal;
	END IF;
END $$;
-- Grant all privileges to postgres user
GRANT ALL PRIVILEGES ON DATABASE test_portal TO postgres;
