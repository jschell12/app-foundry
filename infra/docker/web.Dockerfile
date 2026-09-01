# Builds any of the three frontends. Select with: --build-arg APP=marketing
FROM node:22-alpine AS build
ARG APP
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/${APP}/package.json apps/${APP}/
RUN pnpm install --filter "@app-foundry/${APP}"

COPY apps/${APP} apps/${APP}
RUN pnpm --filter "@app-foundry/${APP}" build

FROM nginx:1.27-alpine
ARG APP
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/${APP}/dist /usr/share/nginx/html
EXPOSE 80
