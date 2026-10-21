# ---- build ----
FROM oven/bun:1.4.3 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun --bun run build

# ---- runtime ----
FROM oven/bun:1.4.3
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/dist ./dist
USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]
