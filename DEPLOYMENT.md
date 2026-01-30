# Deployment Guide

This project uses Nix to build OCI container images compatible with Podman.

## Prerequisites

- Nix with flakes enabled
- Podman

## Building Container Images

### Backend

```bash
# Build the backend container image
nix build .#backendImage

# Load into Podman
podman load < result
```

### Frontend

```bash
# Build the frontend container image
nix build .#frontendImage

# Load into Podman
podman load < result
```

## Running Containers

### Backend

```bash
# Create config directory and copy configuration files
mkdir -p /opt/amirsalarsafaei/config
cp backend/config.toml /opt/amirsalarsafaei/config/
cp backend/spotify.toml /opt/amirsalarsafaei/config/

# Create uploads directory
mkdir -p /opt/amirsalarsafaei/uploads

# Run the backend container
podman run -d \
  --name amirsalarsafaei-backend \
  -p 8000:8000 \
  -p 3001:3001 \
  -v /opt/amirsalarsafaei/config:/config:Z \
  -v /opt/amirsalarsafaei/uploads:/app/uploads:Z \
  amirsalarsafaeicom-backend:latest
```

### Frontend

```bash
# Run the frontend container
podman run -d \
  --name amirsalarsafaei-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://your-backend-host:8000 \
  amirsalarsafaeicom-frontend:latest
```

## Using Podman Compose

Create a `podman-compose.yml` file:

```yaml
version: '3.8'

services:
  backend:
    image: amirsalarsafaeicom-backend:latest
    container_name: amirsalarsafaei-backend
    ports:
      - "8000:8000"
      - "3001:3001"
    volumes:
      - /opt/amirsalarsafaei/config:/config:Z
      - /opt/amirsalarsafaei/uploads:/app/uploads:Z
    restart: unless-stopped

  frontend:
    image: amirsalarsafaeicom-frontend:latest
    container_name: amirsalarsafaei-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
    restart: unless-stopped
```

Run with:

```bash
podman-compose up -d
```

## Deploying to VPS

### 1. Build images locally

```bash
nix build .#backendImage
nix build .#frontendImage
```

### 2. Transfer to VPS

```bash
# Save and compress images
nix build .#backendImage -o backend-image
nix build .#frontendImage -o frontend-image

# Transfer to VPS
scp backend-image your-user@your-vps:/tmp/
scp frontend-image your-user@your-vps:/tmp/

# On VPS: load images
ssh your-user@your-vps "podman load < /tmp/backend-image"
ssh your-user@your-vps "podman load < /tmp/frontend-image"
```

### 3. Or use a registry

```bash
# Tag and push to registry
podman tag amirsalarsafaeicom-backend:latest your-registry.com/amirsalarsafaeicom-backend:latest
podman push your-registry.com/amirsalarsafaeicom-backend:latest

podman tag amirsalarsafaeicom-frontend:latest your-registry.com/amirsalarsafaeicom-frontend:latest
podman push your-registry.com/amirsalarsafaeicom-frontend:latest
```

## Configuration

### Backend Config (`config.toml`)

```toml
auth_token = "your-secure-token"

[database]
url = "postgres://user:password@host:5432/dbname"
max_connections = 20

[server]
host = "0.0.0.0"
port = 8000

[image_server]
host = "0.0.0.0"
port = 3001
upload_dir = "/app/uploads"
```

### Environment Variables (Frontend)

- `PORT` - Server port (default: 3000)
- `HOSTNAME` - Bind address (default: 0.0.0.0)
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Development

Enter development shell:

```bash
nix develop
```

Build packages without containerization:

```bash
nix build .#backend
nix build .#frontend
```
