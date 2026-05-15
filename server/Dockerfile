FROM node:18-alpine AS base
WORKDIR /usr/src/app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

ENV NODE_ENV=production
EXPOSE 5000

# chuyen quyen xuing user 'node' (khong dung quyen root)
USER node

# Start the server 
CMD ["node", "src/server.js"]
