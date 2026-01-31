# Docker Deployment Guide

This guide explains how to build, publish, and run the Docker image for the Test Portal Backend.

## Prerequisites

- Docker installed on your machine.
- Access to the GitHub repository `Vention-Test-Portal/test-portal-be`.
- A GitHub Personal Access Token (PAT) with `read:packages` scope (for pulling images).

## 1. Building and Publishing Images

We use GitHub Actions to build and publish Docker images to the GitHub Container Registry (GHCR).

### Manual Builds

Builds are triggered manually to allow for specific configuration per environment or customer.

1. Go to the **Actions** tab in the GitHub repository.
2. Select the **Create and publish a Docker image** workflow.
3. Click **Run workflow**.
4. Select the **Branch** you want to build from.
5. Fill in the inputs:
   - **Custom Image Tag**: A unique tag for this image (e.g., `customer-a`).
     - If left empty, standard tags (branch name, commit SHA) are used.
   - **Tag with branch name**: (Default: checked). If checked, adds the branch name as a tag (e.g., `feat-new-api`) even if a custom tag is provided.
6. Click **Run workflow**.

### Examples

- **Internal Dev Build**:

  - Branch: `feat/new-api`
  - Custom Tag: (Empty)
  - Result: `ghcr.io/...:feat-new-api`

- **Customer Release**:
  - Branch: `main`
  - Custom Tag: `customer-a`
  - Result: `ghcr.io/...:customer-a` (and `ghcr.io/...:main` if branch tag is kept)

## 2. Running the Image

Since the package is private, you must authenticate with GHCR before pulling the image.

### Step 1: Authenticate

1. Generate a GitHub PAT with `read:packages` scope.
2. Run the following command in your terminal:

```bash
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Step 2: Pull and Run

Replace `TAG_NAME` with the desired tag (e.g., `main`, `customer-a`, `internal-build`).

**Note:** Unlike the frontend, the backend requires environment variables to be passed at runtime.

```bash
# Pull the image
docker pull ghcr.io/vention-test-portal/test-portal-be:TAG_NAME

# Run the container
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:password@host:5432/db" \
  -e JWT_SECRET="your-secret" \
  -e MCP_SECRET="your-mcp-secret" \
  -e API_KEY_SECRET="your-api-key-secret" \
  -e OPENAI_API_KEY="sk-..." \
  ghcr.io/vention-test-portal/test-portal-be:TAG_NAME
```

The application will be available at `http://localhost:3001`.

## 2.1 Build Metadata & Support Endpoint (Internal)

These variables are required to expose build metadata:

- `APP_NAME` (default: `TestPortal`)
- `APP_VERSION`
- `BUILD_HASH`
- `BUILD_TIME` (ISO-8601 UTC)
- `APP_ENV` (`prod|stage|dev`, default: `prod`)
Optional:

- `IMAGE_TAG`

Endpoint:

- `GET /api/v2/meta`
- Header: `Authorization: Bearer <access-token>`

Example:

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:3001/api/v2/meta
```

Security notes:

- Use standard JWT access tokens
- Never log tokens

## 3. Docker Compose Example

You can use the following `docker-compose.yml` to run the application:

```yaml
services:
  backend:
    image: ghcr.io/vention-test-portal/test-portal-be:TAG_NAME
    ports:
      - "3001:3001"
    restart: always
    environment:
      - PORT=3001
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - MCP_SECRET=${MCP_SECRET}
      - API_KEY_SECRET=${API_KEY_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      # Optional
      - LANGSMITH_TRACING=${LANGSMITH_TRACING}
      - LANGSMITH_ENDPOINT=${LANGSMITH_ENDPOINT}
      - LANGSMITH_API_KEY=${LANGSMITH_API_KEY}
      - LANGSMITH_PROJECT=${LANGSMITH_PROJECT}
      - COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
      - COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
      - COGNITO_POOL_REGION=${COGNITO_POOL_REGION}
      - DEFAULT_PROJECT_ID=${DEFAULT_PROJECT_ID}
```

Create a `.env` file next to `docker-compose.yml` with your actual secrets:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
MCP_SECRET=...
API_KEY_SECRET=...
OPENAI_API_KEY=...
```
