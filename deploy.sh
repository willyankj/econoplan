#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Iniciando o processo de deploy..."

# Passo 1: Puxar as últimas alterações do repositório Git
echo "🔄 Puxando as últimas alterações do Git..."
git pull

# Passo 2: Reconstruir e reiniciar os contêineres Docker
# Usamos --env-file para garantir que as variáveis de ambiente sejam carregadas.
# O comando 'up -d --build' irá reconstruir as imagens se o Dockerfile mudou
# e reiniciar os serviços em segundo plano.
echo "🐳 Reconstruindo e reiniciando os contêineres Docker..."
sudo docker compose --env-file .env up -d --build

# Passo 3: Limpar imagens Docker antigas e não utilizadas
# O comando 'image prune -f' remove imagens "dangling" (sem tag) sem pedir confirmação.
# Isso é seguro e não remove dados de volumes.
echo "🧹 Limpando imagens Docker antigas..."
sudo docker image prune -f

echo "✅ Deploy concluído com sucesso!"
