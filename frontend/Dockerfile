# ── Imagen base: Node.js 20 versión ligera ──
FROM node:20-alpine

WORKDIR /app

# Igual que en backend: primero dependencias, luego código
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]