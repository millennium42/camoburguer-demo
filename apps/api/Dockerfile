FROM node:24-alpine

WORKDIR /app/apps/api

COPY packages /app/packages
COPY apps/api /app/apps/api

RUN npm install --omit=dev

EXPOSE 3001

CMD ["npm", "run", "start"]
