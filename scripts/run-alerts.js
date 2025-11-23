// scripts/run-alerts.js

// Este script é um "atalho" para chamar a função Server Action sem um navegador.
// Ele usa a biblioteca Jiti (já presente no seu projeto) para rodar o TypeScript diretamente.

const jiti = require('jiti')(__filename, {
    cache: false,
    interopDefault: true,
    alias: { '@/*': './src/*' } // Importante para o Prisma funcionar
});

// Importa a função Server Action. Note que a sintaxe é diferente fora do Next.js
const { checkDeadlinesAndSendAlerts } = jiti('../src/app/dashboard/actions'); 

// Executa a função principal
async function main() {
    console.log(`[CRON ALERT] Iniciando verificação de prazos: ${new Date().toISOString()}`);
    
    try {
        const result = await checkDeadlinesAndSendAlerts();
        console.log(`[CRON ALERT] Sucesso! ${result.count} alertas de vencimento enviados.`);
    } catch (error) {
        console.error('[CRON ALERT] Erro fatal:', error);
        process.exit(1);
    }
}

main();
