const path = require('path');

// Inicializa o Jiti com o alias correto apontando para a pasta src na raiz
const jiti = require('jiti')(__filename, {
    cache: false,
    interopDefault: true,
    alias: {
        '@': path.join(__dirname, '../src') // <--- CORREÇÃO AQUI
    }
});

// Importa a função Server Action
const { checkDeadlinesAndSendAlerts } = jiti('../src/app/dashboard/actions'); 

async function main() {
    console.log(`[CRON ALERT] Iniciando verificação de prazos: ${new Date().toISOString()}`);
    
    try {
        // Chama a função de verificação
        const result = await checkDeadlinesAndSendAlerts();
        console.log(`[CRON ALERT] Sucesso! ${result.count} alertas de vencimento enviados.`);
    } catch (error) {
        console.error('[CRON ALERT] Erro fatal:', error);
        process.exit(1);
    }
}

main();