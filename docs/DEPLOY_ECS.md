# Deploy BE to ECS

This guide explains how to deploy the Test Portal Backend to AWS ECS using the
`Deploy BE to ECS (manual)` GitHub Actions workflow
(`.github/workflows/deploy-be-ecs.yml`).

## Overview

The workflow is triggered manually. On each run it:

1. Logs into AWS via OIDC (no long-lived keys).
2. Builds the Docker image from the repository's `Dockerfile`.
3. Pushes the image to ECR as both `:<short-sha>` and `:latest`.
4. Forces a new deployment of the target ECS service.
5. Waits until the service reaches a stable state and prints a summary.

Naming convention per environment (`<env>` is one of `dev`, `stg`, `prod`):

| Resource     | Name                       |
| ------------ | -------------------------- |
| ECR repo     | `<env>-testportal-be`      |
| ECS cluster  | `<env>-cluster`            |
| ECS service  | `<env>-be-service`         |
| AWS region   | `eu-central-1`             |

> The backend has **no build-time configuration**. All runtime configuration
> (database URL, JWT secrets, third-party API keys, etc.) lives in the ECS
> Task Definition as `environment` / `secrets` and is **not** managed by this
> workflow.

## Prerequisites

These should already be configured by the ops/devops side. If a deploy fails
because something is missing, ping the infra owner.

- **GitHub secret** `AWS_GITHUB_ACTIONS_ROLE_ARN` — IAM role assumed via OIDC.
  The role's trust policy must allow this repository
  (`repo:VENTIONINC/TestPortal-backend:*`).
- AWS resources for the target environment must exist: ECR repository,
  ECS cluster, ECS service, task definition, ALB / target group,
  Secrets Manager / Parameter Store entries used by the task definition, etc.
- The task definition's container must reference the image either as
  `…/<env>-testportal-be:latest` or without an explicit tag — otherwise
  `--force-new-deployment` will redeploy the **old** image (see
  [How the deploy actually works](#how-the-deploy-actually-works) below).

## How to run a deploy

1. Open the repository on GitHub → **Actions** tab.
2. In the left sidebar choose **Deploy BE to ECS (manual)**.
3. Click **Run workflow** (top-right).
4. Select the **Branch** to deploy from (usually `main` for `prod`,
   feature branch for `dev`).
5. Fill in the inputs (see below).
6. Click **Run workflow** and watch the run.

A typical deploy takes ~5–10 minutes (image build + Prisma migrations +
ECS rollout).

### Inputs

| Input         | Required | Default          | Description                                                                                  |
| ------------- | -------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `environment` | yes      | `dev`            | Target environment: `dev`, `stg`, or `prod`. Drives ECR / ECS resource names.                |
| `image_tag`   | no       | short commit SHA | Custom Docker tag for the built image. Leave empty unless you need to pin a specific tag.    |

### Examples

- **Standard dev deploy from `main`:**
  - `environment`: `dev`
  - `image_tag`: _(empty)_
  - Result: image pushed as `…/dev-testportal-be:<sha>` and `:latest`,
    `dev-be-service` redeployed.

- **Deploy a feature branch to dev:**
  - Branch: `feat/new-endpoint`
  - `environment`: `dev`

- **Production release:**
  - Branch: `main`
  - `environment`: `prod`
  - `image_tag`: `v1.4.0`

## How the deploy actually works

The workflow does **not** create a new revision of the Task Definition. It
runs:

```bash
aws ecs update-service \
  --cluster <env>-cluster \
  --service <env>-be-service \
  --force-new-deployment
```

ECS then restarts the service tasks **using the task definition revision
that is currently associated with the service**. New code only reaches
production if the task definition's `image` field points to a moving tag
(`:latest`) or no tag at all, so ECS pulls a fresh image on restart.

If your task definition pins a specific SHA (e.g.
`…/dev-testportal-be:abc1234`), the workflow will succeed but no new code
will be deployed. In that case either:

- switch the task definition to `:latest`, or
- ask infra to extend the workflow to render a new task definition revision
  per deploy.

## Database migrations

Migrations and persisted skill seeding are run **inside the container at startup** by `start.sh`:

```sh
npx prisma migrate deploy
node dist/prisma/seed/index.js
```

That means:

- They run on every fresh task (including every deploy and every scale-up).
- The persisted system skills are reseeded idempotently on startup so fresh databases do not require a separate manual seed step.
- The deploy is considered successful only when migrations succeed
  **and** the new task passes its health check
  (otherwise ECS rolls back and `services-stable` fails).
- The IAM / network setup must allow the running task to reach the database.

There is no separate "migrate" step in CI — if you need to roll back a
migration, do it manually in the database. Avoid destructive migrations in
the same deploy as code that depends on the new schema; prefer the standard
expand → migrate → contract pattern.

## Rolling back

The workflow does not have a dedicated rollback button. To roll back:

1. Find the previous good commit SHA (e.g. from the run summary or
   `git log`).
2. Run the workflow again with:
   - the same `environment`,
   - `image_tag` set to that SHA (short, 7 characters),
   - the branch that contains that commit.

This rebuilds the old code and pushes it as the new `:latest`, so ECS
picks it up on the next `--force-new-deployment`.

> ⚠️ Rolling back the **application** does not roll back **database
> migrations**. If the bad deploy included a migration, you need to handle
> the schema separately before (or as part of) rolling back the code.

## Troubleshooting

### `Credentials could not be loaded, please check your action inputs`

The OIDC step couldn't get AWS credentials. Common causes:

- The secret `AWS_GITHUB_ACTIONS_ROLE_ARN` is empty or missing.
- The job overrides `permissions:` and drops `id-token: write`.
- The OIDC provider `token.actions.githubusercontent.com` doesn't exist in
  the AWS account, or the role's trust policy doesn't include
  `repo:VENTIONINC/TestPortal-backend:*`.

### `AccessDenied` on `ecr:*` or `ecs:UpdateService`

The IAM role is missing permissions for the chosen environment. The role
must list the corresponding ECR repository and ECS service in its policy
(`<env>-testportal-be`, `<env>-be-service`).

### `services-stable` step times out

ECS started the new tasks but they never became healthy. Check, in this
order:

1. **ECS service events** in the AWS console for the failure reason
   (image pull, health check, IAM, port, etc.).
2. **CloudWatch logs** of the new task. The most common backend-specific
   failures show up here:
   - `prisma migrate deploy` fails (bad migration, missing permissions,
     unreachable DB) — `start.sh` exits and the task dies before passing
     health checks.
   - The app can't read a secret from Secrets Manager / Parameter Store —
     usually a `taskRoleArn` / `executionRoleArn` permission issue.
   - Port mismatch between the container (`EXPOSE 3001`) and the target
     group on the ALB.

### Build fails inside `npm run build` or `prisma generate`

This is unrelated to AWS — same as a local build failure. Reproduce
locally:

```bash
docker build -t be:test .
```

Note that `prisma generate` runs at build time and only needs a valid
connection string format — the default value baked into the `Dockerfile`
is sufficient. It does **not** need to actually reach a database to
build.

## Useful links

- Workflow file: `.github/workflows/deploy-be-ecs.yml`
- Dockerfile: `Dockerfile`
- Startup script (migrations + app start): `start.sh`
- General Docker / GHCR usage: `docs/DOCKER.md`
- Frontend deploy guide (mirror of this one): `TestPortal-client/docs/DEPLOY_ECS.md`
