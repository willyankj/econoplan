#!/bin/bash

# O comando 'set -e' faz o script parar imediatamente se ocorrer algum erro.
set -e

echo "========================================"
echo "🚀 Iniciando Deploy do Econoplan..."
echo "========================================"

# 1. Baixar as atualizações do GitHub
echo "📥 1. Baixando alterações do Git..."

# 2. Instalar novas dependências
echo "📦 2. Verificando dependências..."
npm install

# 3. Atualizar o Banco de Dados
echo "🗄️  3. Sincronizando Banco de Dados..."
npx prisma db push

# 4. Criar a versão de produção (COM OTIMIZAÇÃO DE MEMÓRIA)
echo "🏗️  4. Construindo a aplicação (Build)..."
NODE_OPTIONS="--max-old-space-size=2048" npm run build

# 5. Reiniciar o servidor no PM2
echo "🔄 5. Reiniciando o processo 'econoplan'..."
pm2 restart econoplan

echo "========================================"
echo "✅ SUCESSO! O Econoplan foi atualizado."
echo "========================================"
