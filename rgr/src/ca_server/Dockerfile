FROM oven/bun:1 AS builder
WORKDIR /app

# add openssl
RUN apt-get update && apt-get install -y openssl

COPY ../../package.json  ../../bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

CMD ["bun", "run", "start-ca"]
