ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dev
RUN npm ci
COPY . .
CMD ["node", "server.js"]

FROM base AS prod
ARG APP_VERSION=0.0.0
ENV APP_VERSION=$APP_VERSION
RUN npm ci --omit=dev
COPY . .
CMD ["node", "server.js"]
