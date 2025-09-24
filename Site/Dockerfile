# syntax=docker/dockerfile:1.7   # enables RUN --mount=cache (BuildKit)
# --- build ---
FROM node:24-alpine AS build
WORKDIR /app

# Ensure npm temp and cache go to disk-backed paths (not /tmp tmpfs)
ENV TMPDIR=/app/.tmp
RUN mkdir -p /app/.tmp

# Install deps using a reusable cache mount (doesn't bloat image layers)
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Build Angular
COPY . .
# Adjust configuration name if you use something else
RUN npm run build -- --configuration=production

# --- serve ---
FROM nginx:alpine
# Copy the compiled Angular app (confirm 'flightdeck' matches your dist dir name)
COPY --from=build /app/dist/flightdeck /usr/share/nginx/html