# Build stage
FROM node:20-alpine AS build

# Build-time environment variables
ARG VITE_API_URL
ARG VITE_WEBSOCKET_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL

WORKDIR /app

# Copy package files
COPY package.json ./
COPY client/package.json ./client/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build client
WORKDIR /app/client
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy build from build stage
COPY --from=build /app/client/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
