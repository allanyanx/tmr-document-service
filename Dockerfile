# Usamos una imagen de Debian que es compatible con LibreOffice
FROM node:20-bullseye-slim

# Instalar dependencias del sistema operativo y LibreOffice en modo consola (headless)
# El 'apt-get update' actualiza los repositorios de Linux
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    ure \
    libreoffice-java-common \
    libreoffice-core \
    libreoffice-common \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
# El 'rm' del final es para borrar la caché y que la imagen no pese tanto

# Configurar el directorio de trabajo del microservicio
WORKDIR /app

# Copiar solo los archivos de dependencias primero (Aprovecha la caché de Docker)
COPY package*.json ./
RUN npm ci

# Copiar el resto del código y las plantillas
COPY . .

# Compilar el código TypeScript a JavaScript puro
RUN npm run build

# Exponer el puerto de Fastify
EXPOSE 3000

# 7. Comando de arranque
CMD ["npm", "start"]