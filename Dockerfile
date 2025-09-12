# Multi-stage build to produce a single image serving API + built UI

# Build client
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN npm i --force --silent || true
COPY client/ ./
RUN npm run build

# Install server deps
FROM node:18-alpine AS server-build
WORKDIR /app/server
COPY server/package.json ./
RUN npm i --omit=dev --silent || npm i --silent
COPY server/ ./

# Runtime image
FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy server and built client
COPY --from=server-build /app/server /app/server
COPY --from=client-build /app/client/dist /app/client/dist

EXPOSE 3000
CMD ["node", "server/server.js"]

