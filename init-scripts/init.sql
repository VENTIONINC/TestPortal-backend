CREATE USER postgres WITH PASSWORD 'postgres';
-- Ensure user exists, though it should by default
ALTER USER postgres WITH SUPERUSER;
-- Grant superuser for local dev, simplifies permissions
-- The 'test_portal' database is now created by POSTGRES_DB env var.
-- Ensure the postgres user owns the test_portal database (should be default if POSTGRES_USER is postgres)
ALTER DATABASE test_portal OWNER TO postgres;
-- Grant all privileges on the database to the postgres user
GRANT ALL PRIVILEGES ON DATABASE test_portal TO postgres;
-- Optional: Create a dummy table to check if script ran and can write to test_portal
-- Make sure to connect to test_portal or use a fully qualified name if needed.
-- As this script runs after test_portal is created and we are connected as postgres user to test_portal DB,
-- this should work.
CREATE TABLE IF NOT EXISTS public.init_script_check (id INT);
INSERT INTO public.init_script_check (id)
VALUES (1);