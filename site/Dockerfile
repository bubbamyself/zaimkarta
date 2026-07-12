FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run db:generate \
  && mkdir -p public/uploads/logos \
  && chown -R node:node /app

USER node

EXPOSE 3000

# Build выполняется после запуска PostgreSQL: страницы ZaimKarta читают данные из БД во время сборки.
CMD ["sh", "-c", "npm exec prisma migrate deploy && npm run build && npm run start"]
