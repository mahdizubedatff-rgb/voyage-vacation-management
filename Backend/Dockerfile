# --- Build stage: compile TypeScript ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime stage: production dependencies + compiled JS only ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY seed-images ./seed-images
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 4000 4001
# The same image runs the API (default) and the MCP server (command override in docker-compose.yml).
CMD ["node", "dist/server.js"]
