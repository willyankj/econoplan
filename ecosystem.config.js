module.exports = {
  apps: [
    {
      name: 'econoplan',
      script: 'npm',
      args: 'start', // Roda 'npm start'
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Reinicia se consumir muita memória
      env: {
        NODE_ENV: 'production',
        // Você pode colocar outras variáveis aqui se necessário
      },
    },
  ],
};
