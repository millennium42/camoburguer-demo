FROM node:24-alpine AS ops_web_builder

WORKDIR /app/apps/ops-web

COPY apps/ops-web/package.json apps/ops-web/package-lock.json ./
RUN npm ci

COPY apps/ops-web ./
RUN npm run build

FROM node:24-alpine

WORKDIR /app/apps/api

COPY packages /app/packages
COPY apps/api /app/apps/api
COPY apps/ops-web-legacy /app/apps/ops-web-legacy
COPY scripts /app/scripts
COPY --from=ops_web_builder /app/apps/ops-web/dist /app/apps/ops-web/dist

RUN npm install --omit=dev

USER node

EXPOSE 3001

CMD ["npm", "run", "start"]
