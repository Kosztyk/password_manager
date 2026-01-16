# Monolithic image: builds frontend (Vite) + backend (Node/TS) and runs both via nginx reverse proxy.
# Fix 1: use a full nginx.conf placed at /etc/nginx/nginx.conf (not conf.d/http.d snippets).

# ---------- Frontend build ----------
FROM node:20-alpine AS fe-build
WORKDIR /fe

# Install deps (no lockfile present -> use npm install)
COPY frontend/package.json ./
RUN npm install --no-fund --no-audit

# Build frontend
COPY frontend/ ./
ARG VITE_BUILD_ID=monolith
ENV VITE_BUILD_ID=$VITE_BUILD_ID
RUN npm run build


# ---------- Backend build ----------
FROM node:20-alpine AS be-build
WORKDIR /be

# Install deps including dev (build uses tsc)
COPY backend/package.json ./
RUN npm install --include=dev --no-fund --no-audit

# Build backend
COPY backend/ ./
RUN npm run build


# ---------- Runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

# Install nginx + bash, create required dirs
RUN apk add --no-cache nginx bash \
  && mkdir -p /run/nginx \
  && mkdir -p /usr/share/nginx/html

# Copy backend runtime output + node_modules
COPY --from=be-build /be/dist ./backend/dist
COPY --from=be-build /be/package.json ./backend/package.json
COPY --from=be-build /be/node_modules ./backend/node_modules

# Prune devDependencies from runtime to reduce image size
RUN cd /app/backend && npm prune --omit=dev --no-fund --no-audit

# Copy frontend static build
COPY --from=fe-build /fe/dist /usr/share/nginx/html

# Nginx full config (Fix 1)
COPY docker/monolith/nginx.conf /etc/nginx/nginx.conf

# Remove any default server snippets that may collide (harmless if absent)
RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/http.d/default.conf 2>/dev/null || true

# Entrypoint to start backend then nginx
COPY docker/monolith/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Backend defaults (overridden by env_file in docker-compose)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
