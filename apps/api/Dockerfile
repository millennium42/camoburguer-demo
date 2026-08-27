FROM node:24-alpine
ENV TZ=America/Sao_Paulo

WORKDIR /app/apps/api

COPY packages /app/packages
COPY apps/api /app/apps/api
COPY apps/ops-web-legacy /app/apps/ops-web-legacy
COPY scripts /app/scripts

RUN npm install --omit=dev

USER node

EXPOSE 3001

CMD ["npm", "run", "start"]
