FROM node:18-alpine

# use with --build-arg VERSION=xxxx
ARG VERSION

# Working directory
WORKDIR /app/tailchat

RUN ulimit -n 10240

# Install dependencies
RUN npm install -g pnpm@8.15.8
RUN npm install -g tailchat-cli@latest

# Add mc for minio
# RUN wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
# RUN chmod +x /usr/local/bin/mc

# Copy all source code first
COPY . .

# Install all dependencies (including devDependencies for build)
RUN pnpm install --prod=false

# Build and cleanup (client and server)
ENV NODE_ENV=production
ENV VERSION=$VERSION

# Use official build command
RUN pnpm build

# Install server side plugins
RUN cd server && pnpm run plugin:install com.msgbyte.tasks com.msgbyte.linkmeta com.msgbyte.github com.msgbyte.simplenotify com.msgbyte.topic com.msgbyte.agora com.msgbyte.wxpusher com.msgbyte.welcome com.msgbyte.iam com.msgbyte.discover com.msgbyte.livekit && mkdir -p ./dist/public && cp -r ./public/plugins ./dist/public && cp ./public/registry-be.json ./dist/public

# web static service port
EXPOSE 3000

# Start server, ENV var is necessary
CMD ["pnpm", "start:service"]
