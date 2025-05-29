# Local PostgreSQL + pgAdmin Stack

These notes explain how to spin up the **PostgreSQL 15** database that lives in `docker-compose.yml` together with a ready‑to‑use **pgAdmin 4** UI.  Share this file with anyone who needs a point‑and‑shoot database in their dev environment.

---

## 1 · Prerequisites

| Tool              | Minimum version | Quick check              |
| ----------------- | --------------- | ------------------------ |
| Docker Engine     | 20.10           | `docker --version`       |
| Docker Compose v2 |  2.0            | `docker compose version` |

No other software is required—the containers hold everything.

---

## 2 · Project layout

```text
./
├── docker-compose.yml        # services: postgres + pgadmin
```

---

## 3 · Quick start

```bash
# 1. Build and launch the stack
$ docker compose up -d

# 2. Tail the logs (optional)
$ docker compose logs -f
```

The first start can take ±10 seconds while Postgres initialises and pgAdmin boots.

---

## 4 · Accessing pgAdmin

| URL                                            | Credentials                                                 |
| ---------------------------------------------- | ----------------------------------------------------------- |
| [http://localhost:5050](http://localhost:5050) | **Email:** `admin@example.com`  /  **Password:** `admin123` |

If you change these defaults, remember to update the `PGADMIN_DEFAULT_*` environment variables in *docker‑compose.yml*.

---

## 5 · Register the Postgres server (one‑time)

1. **Login** to pgAdmin with the credentials above.
2. **Add New Server** !\[plug‑icon] in the left sidebar.
3. **General ▸ Name:** *Test Portal* (any label is fine).
4. **Connection tab**

   * **Host name / address:** `postgres`  ← this is the **service name** from Compose, not *localhost*.
   * **Port:** `5432`
   * **Maintenance database:** `postgres` (or leave blank).
   * **Username / Password:** `postgres` / `postgres`.
5. **Save.**  The new server appears in the tree; expand to see `test_portal` plus the built‑in databases `postgres`, `template0`, `template1`.

> 💡  pgAdmin only asks for *Maintenance database* on first contact—it can be any existing DB.

---

## 6 · Useful Compose commands

```bash
# Stop containers but keep volumes
$ docker compose down

# Stop and **wipe** everything (containers + named volumes)
$ docker compose down -v

# Connect to the Postgres shell
$ docker compose exec postgres psql -U postgres -d test_portal

# Check Postgres is healthy (should return "server is accepting connections")
$ docker compose exec postgres pg_isready -U postgres
```

---

## 7 · Volumes & persistence

| Volume name     | Purpose                            | Path inside container      |
| --------------- | ---------------------------------- | -------------------------- |
| `postgres_data` | PostgreSQL data directory          | `/var/lib/postgresql/data` |
| `pgadmin_data`  | pgAdmin config & saved connections | `/var/lib/pgadmin`         |

Delete these volumes (`docker volume rm …`) if you need a completely fresh slate.

---

## 8 · Database Initialization Scripts

The `init-scripts` folder in the project root contains SQL scripts that are automatically executed by Postgres when the database is first created (i.e., when you run `docker compose up -d` for the first time with no existing `postgres_data` volume). These scripts handle tasks like initial user setup and database schema creation. You do not need to run them manually.
