# --- build ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# if your production config is named differently, adjust:
RUN npm run build

# --- serve ---
FROM caddy:2.7-alpine
# copy Angular build output. Replace "flightdeck" if your outputPath differs.
COPY --from=build /app/dist/flightdeck /usr/share/caddy
# minimal SPA Caddyfile
RUN printf ':\nroot * /usr/share/caddy\nencode zstd gzip\nfile_server\ntry_files {path} {path}/ /index.html\n' > /etc/caddy/Caddyfile
EXPOSE 80
CMD ["caddy","run","--config","/etc/caddy/Caddyfile","--adapter","caddyfile"]