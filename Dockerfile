# Usar una imagen de Node.js basada en Debian para instalar Java fácilmente
FROM node:20-bullseye

# Instalar Java (JRE) - Vital para que funcione Apktool
RUN apt-get update && apt-get install -y \
    openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto del servidor (3001 según tu config)
EXPOSE 3001

# Comando para iniciar el servidor usando tsx
CMD ["npm", "start"]
