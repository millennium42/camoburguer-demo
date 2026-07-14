FROM node:24-alpine

WORKDIR /app/apps/print-bridge

COPY apps/print-bridge /app/apps/print-bridge

RUN npm install --omit=dev

EXPOSE 3100

CMD ["npm", "run", "start"]
