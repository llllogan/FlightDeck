# syntax=docker/dockerfile:1.7

# ----- build -----
FROM node:20-bullseye AS build
WORKDIR /app

# disk-backed temp & npm cache
ENV TMPDIR=/app/.tmp
ENV npm_config_cache=/app/.npm
RUN mkdir -p /app/.tmp /app/.npm

COPY package*.json ./
# cache npm artifacts across builds
RUN --mount=type=cache,target=/app/.npm \
    npm ci --no-audit --no-fund

COPY . .
# run Angular build once (no duplicate --configuration flags)
RUN npm run build -- --configuration=production

# ----- runtime -----
FROM nginx:alpine AS runtime
# adjust if your Angular output dir differs
COPY --from=build /app/dist/flightdeck /usr/share/nginx/html
# SPA fallback + sensible cache headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]