# Deployment

The project ships as two Docker images (`backend`, `frontend`) plus a
PostgreSQL container, orchestrated with Docker Compose.

## Prerequisites

- Docker Engine ≥ 24 (or Podman with `docker compose` shim)
- A `.env` file at the repo root (copy from `.env.example`)

## Configure

```bash
cp .env.example .env
$EDITOR .env
```

Required:

| Variable            | Purpose                                 |
| ------------------- | --------------------------------------- |
| `POSTGRES_PASSWORD` | Postgres user password                  |
| `AUTH_TOKEN`        | Token the admin UI sends to the backend |

Optional:

| Variable                                                                                      | Purpose                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------ |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`, `SPOTIFY_REDIRECT_URI` | Spotify "now playing" integration    |
| `NEXT_PUBLIC_GRPC_WEB_URL`, `NEXT_PUBLIC_IMAGE_SERVER_WEB_URL`                                | Frontend → backend URLs (build-time) |
| `CARGO_REGISTRY` / `CARGO_REGISTRY_TOKEN`                                                     | Private cargo mirror for image build |
| `NPM_REGISTRY` / `NPM_REGISTRY_TOKEN`                                                         | Private npm mirror for image build   |

## Build & run locally

```bash
just docker-build   # docker compose build
just up             # docker compose up -d
just logs           # tail logs
just down           # stop & remove
```

The stack:

```diagram
╭───────────╮      ╭──────────╮      ╭──────────╮
│ frontend  │─────▶│ backend  │─────▶│ postgres │
│ :3000     │ gRPC │ :8000    │ sqlx │ :5432    │
╰───────────╯ Web  │ :3001    │      ╰──────────╯
                   ╰──────────╯
                        │
                  uploads volume
```

A separate `migrate` one-shot service runs `--migrate-only` on the backend
binary before `backend` starts, so the schema is always current.

## Dev hot-reload

`compose.override.yaml` adds a `frontend-dev` service (under the `dev`
profile) that mounts your source tree and runs `next dev`:

```bash
docker compose --profile dev up -d postgres backend frontend-dev
# or
just dev
```

## Deploying to a VPS

### Option A — Build remotely (rsync source + build on host)

```bash
just deploy-rsync     # rsyncs source to your VPS
ssh finRoot 'cd /root/amirsalarsafaei.com && just docker-build && just up'
```

### Option B — Build locally, ship images over SSH

```bash
just deploy-docker    # docker save | gzip | ssh remote 'gunzip | docker load'
ssh finRoot 'cd /path/to/compose && docker compose up -d'
```

### Option C — Pull from GHCR (CI-built images)

The workflow at `.github/workflows/build-publish.yml` publishes:

- `ghcr.io/<owner>/amirsalarsafaei-com/backend:<tag>`
- `ghcr.io/<owner>/amirsalarsafaei-com/frontend:<tag>`

Reference those images in a remote `compose.yaml` and `docker compose pull && up -d`.

## Backend configuration

The backend reads from environment variables (preferred in containers) **or**
a TOML file (see `backend/config.example.toml`). The container `entrypoint`
already wires env vars from `compose.yaml`, so you usually only need `.env`.

If you mount a TOML file, place it at `/config/config.toml`:

```bash
docker run -d \
  -v $PWD/backend/config.toml:/config/config.toml:ro \
  -v amirsalarsafaeicom_uploads:/uploads \
  -p 8000:8000 -p 3001:3001 \
  amirsalarsafaeicom-backend:latest
```

## Healthchecks

Both services expose Docker healthchecks (see Dockerfiles). `compose.yaml`
uses `depends_on: condition: service_healthy`, so the frontend only starts
after the backend is responsive.
