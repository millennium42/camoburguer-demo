FROM node:24-alpine
ENV TZ=America/Sao_Paulo

WORKDIR /app/apps/event-simulator

COPY apps/event-simulator /app/apps/event-simulator
COPY scripts/demo-simulator-client.mjs /app/scripts/demo-simulator-client.mjs

CMD ["npm", "run", "start"]
