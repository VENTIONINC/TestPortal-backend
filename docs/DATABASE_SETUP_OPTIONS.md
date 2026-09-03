# Database Setup Options

For the implementation of the dashboard metrics, we need to add a new `DailyExecutionMetric` table to the database. You have two options for your local development environment.

## Option 1: Use Existing Development Database (Recommended)

**Pros:**

- **Immediate Context**: You already have test execution data (`Project`, `Execution`, `Result`). You can test the dashboard aggregation logic against real data immediately.
- **Speed**: No setup required.
- **Safety**: The change is **additive**. We are only adding a new table for metrics. We are NOT modifying or deleting existing columns. Existing code will run fine.

**Cons:**

- **Schema Drift**: Your local database schema will be slightly ahead of the `main` branch until this feature is merged. (This is standard development practice).

**Instructions**:
Simply run the migration command:

```bash
npm run migrate  # Creates tables (including new metrics table)
```

---

## Option 2: Isolated Fresh Database Instance

**Pros:**

- **Isolation**: Guaranteed no impact on your current development environment.
- **Clean State**: Good for verifying everything works from scratch.

**Cons:**

- **Empty Data**: The dashboard will be empty. You will need to upload test reports or generate test traffic to verify the charts. The `npm run seed` command only seeds persisted system skill packages.
- **Setup Overhead**: Requires managing a second database container.

**Instructions**:

1.  **Start the separated Database**:
    I have created `docker-compose.dashboard.yml` for you. Run:

    ```bash
    docker-compose -f docker-compose.dashboard.yml up -d
    ```

2.  **Update Environment**:
    Modify your `.env` file to point to this new instance (Port 5435):

    ```
    # Comment out your old URL
    # DATABASE_URL="postgresql://postgres:postgres@localhost:5433/test_portal?schema=public"

    # Add new URL
    DATABASE_URL="postgresql://postgres:postgres@localhost:5435/test_portal_dashboard?schema=public"
    ```

3.  **Initialize**:
    ```bash
    npm run migrate  # Creates tables (including new ProjectMeta)
    ```

    Upload test reports through `POST /api/v2/upload-json-report` or
    `POST /api/v2/upload-json-report-api-key` to populate dashboard data.
