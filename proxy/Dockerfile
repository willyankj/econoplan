FROM nginx:1.25-alpine

# Remove a configuração padrão
RUN rm /etc/nginx/conf.d/default.conf

# Adiciona a nossa configuração personalizada
COPY nginx.conf /etc/nginx/conf.d/
