FROM node:20-alpine

# Instalar dependencias esenciales
RUN apk add --no-cache git bash ca-certificates

WORKDIR /app

# Variables de entorno para Expo y desarrollo
ENV EXPO_NO_TELEMETRY=1
ENV NODE_ENV=development
ENV HOST=0.0.0.0

# Instalar Expo CLI globalmente + ngrok para tunnel mode
RUN npm install -g expo-cli @expo/cli @expo/ngrok@^4.1.0

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias del proyecto
RUN npm install --legacy-peer-deps

# Copiar el código source
COPY . .

# Puertos para Expo: 19000 (expo), 19001 (metro), 19002 (http), 8081 (metro bundler)
EXPOSE 19000 19001 19002 8081