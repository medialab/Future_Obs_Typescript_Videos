# syntax=docker/dockerfile:1

### Build stage
FROM node:20-bullseye AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build   # uses adapter-node, outputs to build/

### Runtime stage
FROM node:20-bullseye-slim AS runtime
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm ci
COPY --from=build /app/build ./build

RUN mkdir -p /app/tmp/uploads
EXPOSE 3000
CMD ["node", "build/index.js"]