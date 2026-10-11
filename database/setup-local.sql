DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appuser') THEN
        CREATE ROLE appuser LOGIN PASSWORD 'apppassword';
    END IF;
END $$;

SELECT 'CREATE DATABASE assignmentdb OWNER appuser'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'assignmentdb');
\gexec

GRANT ALL PRIVILEGES ON DATABASE assignmentdb TO appuser;

\c assignmentdb;

CREATE TABLE IF NOT EXISTS user_credential (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_info (
    user_id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    mobile_number VARCHAR(15) NOT NULL,
    email VARCHAR(254) NOT NULL,
    user_type VARCHAR(1) NOT NULL CHECK (user_type IN ('U', 'A')),
    CONSTRAINT uk_user_info_email UNIQUE (email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON user_credential, user_info TO appuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO appuser;
