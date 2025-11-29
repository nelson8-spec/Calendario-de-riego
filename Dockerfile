FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar archivos de dependencias primero para aprovechar la cache de Docker
COPY package*.json ./

RUN npm install --production

# Copiar el resto de la aplicación
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
