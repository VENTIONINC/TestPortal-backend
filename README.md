# test-results-manager

## Setup Instructions

1.  **Initialize Prisma and set up the database:**

    ```sh
    npx prisma init --datasource-provider sqlite
    npm run migrate # This likely runs 'npx prisma migrate dev --name <some_name>'
    ```

2.  **Create a `.env` file** in the root of the project with the following content:

    ```env
    DATABASE_URL="file:./dev.db"
    ```

3.  **Run the server:**

    ```sh
    npm run server
    ```

4.  **Seed the database** (assuming the server is running on port 3001):

    ```sh
    node prisma/seed/index.js
    ```

5.  **Open in browser:** `http://localhost:3001/api/results` (or your relevant API endpoint)

## Documentation

- [API Documentation](docs/API_DOCUMENTATION.md)
- [How to Inspect the MCP Server](docs/INSPECT_MCP_SERVER.md)
