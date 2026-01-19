
![favicon](https://github.com/user-attachments/assets/167abf7f-cd47-4b11-9531-5756a6c74933)

# Password Manager (Monolith)

A self-hosted password management web application packaged as a **single monolithic container**:

* **Frontend**: static build served by **Nginx**
* **Backend**: **Node.js API** (TypeScript build)
* **Database**: **PostgreSQL** (external or existing instance)

---
<img width="1632" height="804" alt="Screenshot 2026-01-16 at 19 55 27" src="https://github.com/user-attachments/assets/7da3912f-d93b-497c-a723-ad4890fd9ed7" />

## Features

* Password entries stored encrypted (server-side encryption model).
* JWT-based authentication.
* Optional password recovery flow (enabled via `APP_RECOVERY_KEY`).
* App/site icons stored directly in PostgreSQL (`BYTEA`) to avoid volume storage.

---

## Requirements

* Docker Engine + Docker Compose plugin
* A reachable PostgreSQL instance (example: `192.168.1.3:5432`)
* DNS/host reachability to the machine running the container

---

## Quick Start

1. Create `.env` in the project root (example below).

2. Start the container:

```bash
docker compose up -d --build
```

3. Open the UI:

* `http://<HOST_IP>:${APP_HTTP_PORT}`
  Example: `http://192.168.1.3:8085`

---

## Configuration

### `.env` (example)

```dotenv
# PostgreSQL connection string
DATABASE_URL=postgresql://database:CHANGE_ME@192.168.3.1:5432/password_app

# JWT secret (32+ bytes recommended)
JWT_SECRET=REPLACE_WITH_RANDOM_64_HEX

# Base64 master key (32 bytes recommended)
# Generate: openssl rand -base64 32
APP_MASTER_KEY=REPLACE_WITH_BASE64_32B

# Optional: host port for web UI
APP_HTTP_PORT=8085

# Optional: enables password recovery flow
# Generate: openssl rand -hex 32
APP_RECOVERY_KEY=REPLACE_WITH_RANDOM_64_HEX

# Optional: frontend build cache-buster
VITE_BUILD_ID=monolith-0.1.0
```

### Environment variables used

**Required**

* `DATABASE_URL`
* `JWT_SECRET`
* `APP_MASTER_KEY`

**Optional**

* `APP_HTTP_PORT` (Compose-only)
* `APP_RECOVERY_KEY` (enables Forgot Password flow)
* `VITE_BUILD_ID` (build arg; cache-buster)

---

## Docker Compose

Example `docker-compose.yml` (monolith build + tagged image):

```yaml
services:
  postgres:
    image: postgres:17
    container_name: password-manager-db
    environment:
      POSTGRES_DB: password_app
      POSTGRES_USER: jailmaker
      POSTGRES_PASSWORD: 1FloareA1
    volumes:
      - pm_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jailmaker -d password_app"]
      interval: 10s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  password-manager:
    image: kosztyk/password-manager:4th
    build:
      context: .
      args:
        VITE_BUILD_ID: ${VITE_BUILD_ID:-monolith-0.1.0}
    env_file: .env
    environment:
      # Override DATABASE_URL to point at the postgres service
      DATABASE_URL: postgresql://jailmaker:1FloareA1@postgres:5432/password_app
      APP_VERSION: "0.1.0"
      NODE_ENV: production
      PORT: "3000"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "${APP_HTTP_PORT:-8085}:80"
    restart: unless-stopped

volumes:
  pm_postgres_data:

```

Notes:

* Backend listens on `:3000` **inside** the container.
* Nginx listens on `:80` and proxies `/api/*` to the backend.
* No volumes are required for icons (icons are stored in PostgreSQL).

---

## Troubleshooting

### “401 Unauthorized” when requesting icon endpoints

Most `/api/*` endpoints require authentication. Test with a valid JWT token or via the UI.

### Verify which container is running

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

### View logs

```bash
docker logs -f <container_name>
```


---

## Security Notes

* Use strong values for `JWT_SECRET` and `APP_MASTER_KEY`.
* Use TLS (reverse proxy) if exposing beyond a trusted LAN.
* Restrict database access to trusted networks and enforce strong credentials.

---

## License

Add your preferred license here (e.g., MIT) or remove this section if not applicable.

