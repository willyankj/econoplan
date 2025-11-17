# 1. Imagem base do Python
FROM python:3.11-slim

# 2. Variáveis de ambiente para Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 3. Define o diretório de trabalho
WORKDIR /app

# 4. Instala dependências
# Copia SÓ o requirements.txt primeiro para aproveitar o cache do Docker
COPY requirements.txt /app/
RUN pip install -r requirements.txt

# 5. Copia o resto do código
# (Na prática, o docker-compose vai usar o volume que definimos)
COPY . /app/
