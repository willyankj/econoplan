#!/bin/bash

# O comando 'set -e' faz o script parar imediatamente se ocorrer algum erro.
# Isso evita que ele tente reiniciar o site se o 'build' falhar, por exemplo.
set -e

echo "========================================"
echo "🚀 Iniciando Deploy do Econoplan..."
echo "========================================"

# 1. Baixar as atualizações do GitHub
echo "📥 1. Baixando alterações do Git..."
git pull

# 2. Instalar novas dependências (caso você tenha adicionado alguma biblioteca)
echo "📦 2. Verificando dependências..."
npm install

# 3. Atualizar o cliente do Banco de Dados (Prisma)
# Isso garante que o Next.js entenda as mudanças no schema.prisma
echo "🗄️  3. Regenerando Prisma Client..."
npx prisma generate

# Opcional: Se você mudar o banco de dados, descomente a linha abaixo para aplicar automaticamente
# echo "🔄 3.5 Aplicando migrações no banco..."
# npx prisma migrate deploy

# 4. Criar a versão de produção do Next.js
echo "🏗️  4. Construindo a aplicação (Build)..."
npm run build

# 5. Reiniciar o servidor no PM2
echo "mw 5. Reiniciando o processo 'econoplan'..."
pm2 restart econoplan

echo "========================================"
echo "✅ SUCESSO! O Econoplan foi atualizado."
echo "========================================"
