# --- build ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# if your production config is named differently, adjust:
RUN npm run build -- --configuration=production

# Stage 2: serve static files
FROM nginx:alpine
# Angular outputs to dist/<project-name>; adjust path accordingly
COPY --from=build /app/dist/flightdeck /usr/share/nginx/html
# Optional: custom nginx conf (gzip, cache headers)
# COPY nginx.conf /etc/nginx/conf.d/default.conf