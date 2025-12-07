FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm install -g npm@latest
RUN npm install --legacy-peer-deps --production
COPY . .
EXPOSE 4000
CMD ["node", "src/index.js"]
