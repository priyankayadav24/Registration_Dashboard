# User Login Platform (no Docker)

A local development application with a React + Vite UI, Spring Boot API Gateway, Auth Service, User Service, and PostgreSQL. The application is configured for Java 21 / Spring Boot 3.3.5.

## Architecture and ports

| Component | Port | Purpose |
|---|---:|---|
| React + Vite | 3000 | Login, registration and dashboard UI |
| API Gateway | 8080 | Frontend API entry point |
| Auth Service | 8081 | Registration, login, password hashing, JWT issue |
| User Service | 8082 | Authenticated user details, admin listing and CSV export |
| PostgreSQL | 5432 | Shared `assignmentdb` database |

## Prerequisites

- JDK 21 (check `java -version`)
- Apache Maven 3.9+ (`mvn -version`)
- Node.js 20+ and npm
- PostgreSQL 15+ installed as a Windows service; **Docker is not used**

## 1. Configure PostgreSQL

1. Start the PostgreSQL service from Windows Services. Make sure it listens on port `5432`.
2. Open pgAdmin and connect to the `postgres` database as your PostgreSQL administrator.
3. Open Query Tool connected to `postgres` and run `setup-database.sql` to create/update role `appuser` with password `apppassword`. Then create a database named `assignmentdb` owned by `appuser` using pgAdmin (right-click **Databases → Create → Database**, set owner to `appuser`), or run `CREATE DATABASE assignmentdb OWNER appuser;` as a separate query if it does not already exist.
4. Both backend services use `jdbc:postgresql://localhost:5432/assignmentdb` by default. The startup script checks `5432` and then `5434` on localhost, passing the detected port to the services. For a PostgreSQL server at another host or port, set `APP_DB_URL` before running the script, for example `$env:APP_DB_URL = 'jdbc:postgresql://localhost:5433/assignmentdb'`.

These are local-development credentials only. Change them before using the app outside your machine.

## 2. Start backend services

Close any existing process using ports 8080, 8081, or 8082. From PowerShell, in the project root, run:

```powershell
.\start-services.ps1
```

This opens one terminal per service. Wait until each terminal reports that Spring Boot has started. If you prefer Eclipse, import each of `api-gateway`, `auth-service`, and `user-service` as separate Maven projects and run each `*Application.java` class. Start auth and user services before the gateway. If a port is already in use, stop the process that owns it instead of starting a duplicate instance.

## 3. Start frontend

Open a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually **http://localhost:3000**). Do not open `index.html` with `file://`. Vite must serve the React entry point. The API Gateway accepts frontend development origins on localhost or 127.0.0.1, including when Vite selects another port.

To verify frontend compilation:

```powershell
npm run build
```

## Registration and login behavior

- Registration accepts first name, last name, email, Indian mobile number, password and confirm password.
- Passwords are stored as BCrypt hashes, never as plain text.
- Duplicate emails are rejected.
- Login issues a signed JWT; the dashboard fetches profile data through the gateway.
- Normal users can view their own profile. Admin users can view all users and download a CSV.
- New registrations receive user type `U` by default. To promote a trusted account to admin in a local test database, run this in pgAdmin Query Tool connected to `assignmentdb`:

```sql
UPDATE user_info SET user_type = 'A' WHERE email = 'admin@example.com';
```

Log in again after promotion so the JWT contains the updated role. Do not expose the admin promotion process in a public app.

## Troubleshooting

- **Blank screen / MIME error:** Open `http://localhost:3000`, not the HTML file directly. In `frontend`, run `npm install` and `npm run dev`; verify `index.html` loads `/src/main.jsx`.
- **Port 8080 already in use:** Stop the existing gateway process, or identify it with `netstat -ano | findstr :8080` and stop the correct PID. Do not start a second gateway on the same port.
- **Database connection refused:** Verify the PostgreSQL Windows service is running and the configured port is correct. Test in pgAdmin; both backend services must be able to connect to `assignmentdb`.
- **Cannot reach backend from UI:** Confirm auth-service (8081), user-service (8082), and gateway (8080) all started without errors. Frontend requests go to `http://localhost:8080/api/...`.
- **Login says user not found:** Register the account first. Registration is persisted in `user_credential` and `user_info`.
- **Validation error:** Use a valid email, a 10-digit Indian mobile number (optionally prefixed with +91), and a password of 8–72 characters.

## Important

This package is configured to avoid Docker. Run `npm run build` in `frontend` to verify the frontend bundle locally. A full end-to-end runtime test requires PostgreSQL to be running and Maven dependencies to resolve on the target computer; those local services cannot be assumed to exist in every environment.
