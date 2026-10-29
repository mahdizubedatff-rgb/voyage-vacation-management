# Voyage — Backend

Express 5 + TypeScript REST API, MongoDB (Mongoose), JWT auth, Multer uploads, Google Gemini AI and the Voyage **MCP server**.
The full documentation is in the project's main `README.md`. In the submission ZIP a copy of it is in `Backend/project-root/`.

## Running from the submission ZIP

The ZIP contains `Database/`, `Backend/` and `Frontend/`. The project-level files (`docker-compose.yml`, `.env.example`, `README.md`, `.gitignore`) are copied in `Backend/project-root/`.

```bash
# from the folder that contains Backend/, Frontend/ and Database/
cp Backend/project-root/docker-compose.yml Backend/project-root/.env.example Backend/project-root/README.md .
cp .env.example .env            # set JWT_SECRET; optionally GEMINI_API_KEY for live AI
docker compose up -d --build    # open http://localhost:8080
```

On Windows PowerShell, use `Copy-Item Backend\project-root\* . ; Copy-Item .env.example .env`.

## Local development

```bash
npm install
cp ../.env.example .env     # or Backend/project-root/.env.example; set JWT_SECRET and MONGODB_URI
npm run seed                # repeatable demo data (14 vacations, 6 accounts, 23 likes)
npm run dev:mcp             # MCP server on :4001
npm run dev                 # API on :4000
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `npm start` | API (watch mode / compiled) |
| `npm run dev:mcp` / `npm run start:mcp` | MCP server over Streamable HTTP |
| `npm run mcp:stdio` | MCP server over stdio (MCP Inspector, desktop clients) |
| `npm run seed` | Wipe and recreate demo data |
| `npm run db:export` | Export collections to `../Database/export` |
| `npm run typecheck` / `npm run lint` / `npm run build` | Quality gates |
| `npm test` | Vitest + Supertest (set `MONGO_TEST_URI` to any MongoDB) |

The API reference and Postman collection (`postman/Voyage.postman_collection.json`) are described in the main README.
