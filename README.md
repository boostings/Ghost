# Ghost

Ghost is a class-specific Q&A platform for Illinois State University classes with faculty-verified answers and shared course whiteboards.

## What You Will Run

- `postgres` (database) on port `5432`
- `backend` (Spring Boot API) on port `8080`
- `frontend` (Expo React Native app) in a separate terminal

## Before You Start (Required Software)

Install these first:

1. **Git** (to clone the project)
2. **Docker Desktop** (must be open and running)
3. **Bun** (latest stable release recommended)

## Step 1: Open the Project Folder

If you have not cloned the repo yet:

```bash
git clone <REPO_URL>
cd Ghost
```

If you already have the repo, just open a terminal and go to the folder:

```bash
cd /path/to/Ghost
```

## Step 2: Start Database + Backend (Docker)

From the project root (`Ghost` folder), run:

```bash
docker compose up --build
```

What this does:

- Builds the backend Docker image
- Starts PostgreSQL (`ghost_db`)
- Starts backend after database is healthy

Important:

- Keep this terminal open. It is now running your backend and database.
- First run can take a few minutes.

How to know it worked:

- You should see logs for both `ghost-postgres` and `ghost-backend`.
- Seeing a `404` page at `http://localhost:8080` is normal if there is no root endpoint.

## Step 3: Start Frontend (New Terminal Window)

Open a **second** terminal window/tab.

Go to frontend folder:

```bash
cd /path/to/Ghost/frontend
```

Install dependencies (first time only, or after dependency changes):

```bash
bun install
```

Start Expo:

```bash
bun run start
```

What to do after Expo starts:

- Press `w` to open web version in browser, or
- Scan the QR code with Expo Go on your phone, or
- Press `i` (iOS simulator) / `a` (Android emulator) if installed

## Step 4: Confirm Everything Is Running

You should now have:

1. Terminal 1: Docker logs for database + backend
2. Terminal 2: Expo dev server running frontend

If the frontend loads and you can reach app screens, startup is complete.

## Daily Startup (Short Version)

Each day, from the project root:

```bash
docker compose up
```

In another terminal:

```bash
cd frontend
bun run start
```

Use `bun install` again only when dependencies change.

## Stopping Everything

To stop frontend:

- In frontend terminal, press `Ctrl + C`

To stop backend + database:

- In Docker terminal, press `Ctrl + C`

If you want containers fully removed after stopping:

```bash
docker compose down
```

## Troubleshooting (Most Common Issues)

### Docker command fails or services do not start

- Make sure Docker Desktop is installed and open
- Wait until Docker Desktop says it is running
- Retry:

```bash
docker compose up --build
```

### Port already in use (`5432` or `8080`)

Another app is already using that port.

- Stop the conflicting app, then rerun Docker
- Or change ports in `docker-compose.yml` (only if you know what you are doing)

### Frontend cannot reach backend from phone

If testing on a physical phone, `localhost` may not work. Create `frontend/.env`:

```bash
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LOCAL_IP:8080
EXPO_PUBLIC_WS_URL=ws://YOUR_COMPUTER_LOCAL_IP:8080
```

Then restart Expo:

```bash
bun run start
```

Your phone and computer must be on the same Wi-Fi network.

### Need a clean reset

Stop everything, then from project root:

```bash
docker compose down
docker compose up --build
```

If you need to wipe database data too (destructive):

```bash
docker compose down -v
docker compose up --build
```

`-v` deletes persisted Postgres data.

## Using a Render Postgres Database

The backend now reads its datasource from environment variables first, with the local Docker database as the fallback.

For a Render Postgres database, set:

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://<render-host>:5432/<render-db>?sslmode=require
SPRING_DATASOURCE_USERNAME=<render-user>
SPRING_DATASOURCE_PASSWORD=<render-password>
```

Notes:

- Render gives you a `postgresql://...` connection string. Spring Boot should be given the JDBC form, which is the same value with `jdbc:` added in front and `?sslmode=require` appended.
- Keep `docker compose` for local Postgres development only. If you point the backend at Render, the backend will use Render instead of the local container database.

### One-Time Data Migration from Local Docker Postgres to Render

Create a backup from the Dockerized local database:

```bash
docker exec ghost-postgres pg_dump -U ghost_user -d ghost_db --no-owner --no-privileges -Fc > /tmp/ghost-local.dump
```

Restore it into Render:

```bash
PGPASSWORD="<render-password>" pg_restore \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --dbname="sslmode=require host=<render-host> port=5432 dbname=<render-db> user=<render-user> password=<render-password>" \
  /tmp/ghost-local.dump
```
