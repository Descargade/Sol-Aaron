FROM node:22-slim

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY lib/db/package.json lib/db/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/api-spec/package.json lib/api-spec/
COPY artifacts/api-server/package.json artifacts/api-server/

RUN pnpm install --frozen-lockfile || pnpm install

COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/

RUN cd artifacts/api-server && pnpm run build

EXPOSE 3000

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
