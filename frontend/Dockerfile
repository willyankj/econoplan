# --- ESTÁGIO 1: Build (Compilar o React) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copia o package.json e instala as dependências
COPY package.json package-lock.json /app/
RUN npm install

# Copia o resto do código e compila o projeto
COPY . /app/
# (O Jules pode precisar alterar 'npm run build' se o Vite usar outro script)
RUN npm run build

# --- ESTÁGIO 2: Serve (Servir com Nginx) ---
FROM nginx:1.25-alpine

# Copia os arquivos compilados do estágio 'builder'
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração do Nginx para o SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf
