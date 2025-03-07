# Use Node 20 based on Debian Bookworm which has a newer libstdc++ library
FROM node:20.9.0-bookworm

# Install ffmpeg which is required by fluent-ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3333

CMD ["node", "server.js"]
