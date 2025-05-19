1. create .env file with db url

   ```env
   DATABASE_URL="file:./dev.db"
   ```

2. init prisma db

   ```sh
   npm run migrate
   ```

3. run server
   ```sh
   npm run server
   ```
4. seed data (assuming server is running on port 3001)

```sh
   node prisma/seed/index.js
```

5. open in browser `http://localhost:3001/api/results`
