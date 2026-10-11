-- Run this in pgAdmin Query Tool connected to the default `postgres` database.
-- This script creates or resets the local development role only.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'appuser') THEN
    CREATE ROLE appuser LOGIN PASSWORD 'apppassword';
  ELSE
    ALTER ROLE appuser WITH LOGIN PASSWORD 'apppassword';
  END IF;
END
$$;
