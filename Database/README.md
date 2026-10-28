# Voyage — Database

MongoDB database `voyage` with three collections:

| Collection  | Fields                                                                  | Notes                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| `users`     | `_id`, `firstName`, `lastName`, `email`, `password` (bcrypt), `role`    | `email` is unique; `role` is `USER` or `ADMIN`    |
| `vacations` | `_id`, `destination`, `description`, `startDate`, `endDate`, `price`, `imageName` | `price` 0 < p ≤ 10,000; image file stored in uploads |
| `likes`     | `_id`, `userId`, `vacationId`                                           | unique compound index on `(userId, vacationId)`   |

## Contents

| Path                        | What it is                                                                 |
| --------------------------- | -------------------------------------------------------------------------- |
| `voyage-dump.archive.gz`    | `mongodump` archive (gzip) of the `voyage` database                         |
| `export/*.json`             | The same data as Canonical Extended JSON arrays (`mongoimport --jsonArray`) |
| `images/`                   | The image files referenced by `vacations.imageName` (`seed-*.jpg`)          |

The export contains the 14 seed vacations, 6 demo accounts (1 admin, 5 travellers) and 23 likes.
Seed vacation dates are relative to the day the seed ran (28 Oct 2026), so a fresh seed always has a mix of past, active and upcoming trips.

## Option A — recreate with the seed script (recommended)

The seed script is repeatable: it clears the three collections, copies the seed images into the uploads folder and inserts fresh data with dates relative to today.

```bash
cd Backend
npm run seed
```

With Docker, nothing is needed: the backend seeds automatically when the database is empty (`SEED_ON_EMPTY=true`).
To reseed the Docker database: `docker compose exec backend node dist/seed/seed.js`.

## Option B — restore this exact export

Docker (from the project root, with the stack running):

```bash
docker compose exec -T mongo mongorestore --archive --gzip --drop < Database/voyage-dump.archive.gz
docker compose cp Database/images/. backend:/app/uploads/
```

Local MongoDB (requires MongoDB Database Tools):

```bash
mongorestore --uri "mongodb://localhost:27017" --archive=Database/voyage-dump.archive.gz --gzip --drop
# or, from JSON:
mongoimport --db voyage --collection users     --jsonArray --drop --file Database/export/users.json
mongoimport --db voyage --collection vacations --jsonArray --drop --file Database/export/vacations.json
mongoimport --db voyage --collection likes     --jsonArray --drop --file Database/export/likes.json
cp Database/images/* Backend/uploads/
```

## Demo accounts (development only)

| Role  | Email               | Password    |
| ----- | ------------------- | ----------- |
| Admin | `admin@voyage.dev`  | `Admin1234` |
| User  | `user@voyage.dev`   | `User1234`  |

Other travellers (`daniel@`, `noa@`, `omar@`, `lior@voyage.dev`) share the user password. These are throw-away development credentials. Change `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` before seeding anything that is publicly reachable.

## Re-exporting

```bash
cd Backend
npm run db:export                       # JSON → ../Database/export
docker compose exec -T mongo mongodump --db voyage --archive --gzip > Database/voyage-dump.archive.gz
```
