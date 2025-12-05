
import { PrismaClient } from '@prisma/client';
import { upsertTransaction, deleteTransaction } from '../src/app/dashboard/actions/finance';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Mock do FormData
class MockFormData {
    private data: Record<string, string> = {};
    append(key: string, value: string) { this.data[key] = value; }
    get(key: string) { return this.data[key]; }
    entries() { return Object.entries(this.data); }
    [Symbol.iterator]() { return this.entries()[Symbol.iterator](); }
}

// Mock da validação de usuário (precisamos bypassar ou simular)
// Como as actions usam `validateUser`, e ele depende de cookies/auth, não vai rodar direto no script isolado sem mockar.
// Vou criar uma versão simplificada da lógica da action aqui para testar a LÓGICA DE BANCO,
// ou tentar mockar o `validateUser` se possível.
// Mas `validateUser` é importado de `@/lib/action-utils`.
// O melhor é copiar a lógica "Core" da action para este script para isolar se o problema é Prisma/Logica.

async function run() {
    console.log("Iniciando reprodução...");

    // 1. Criar Tenant e Workspace e User Fakes
    const tenantId = uuidv4();
    const workspaceId = uuidv4();
    const userId = uuidv4();

    await prisma.tenant.create({ data: { id: tenantId, name: "Test Tenant", slug: `test-${tenantId}` } });
    await prisma.user.create({ data: { id: userId, email: `test-${userId}@example.com`, tenantId } });
    await prisma.workspace.create({ data: { id: workspaceId, name: "Test Workspace", tenantId } });
    await prisma.workspaceMember.create({ data: { userId, workspaceId, role: "ADMIN" } });

    // 2. Criar Contas
    const acc1 = await prisma.bankAccount.create({
        data: { name: "Conta A", bank: "Nubank", balance: 1000, workspaceId }
    });
    const acc2 = await prisma.bankAccount.create({
        data: { name: "Conta B", bank: "Inter", balance: 0, workspaceId }
    });

    console.log(`Saldos Iniciais: A=${acc1.balance}, B=${acc2.balance}`);

    // 3. Simular Upsert (Transferência)
    // Vou chamar a lógica diretamente para não depender do mock de Auth da action original
    // Mas copiando a exata lógica da action `upsertTransaction` (parte do TRANSFER)

    const amount = 100;
    const date = new Date();

    // LÓGICA COPIADA DA ACTION (Simplificada sem Zod/Auth, mas com a transação Prisma)
    try {
          await prisma.$transaction(async (tx) => {
              const sourceAcc = await tx.bankAccount.findUnique({ where: { id: acc1.id } });
              const destAcc = await tx.bankAccount.findUnique({ where: { id: acc2.id } });

              if (!sourceAcc || !destAcc) throw new Error("Contas não encontradas.");

              const category = await tx.category.upsert({
                  where: { workspaceId_name_type: { workspaceId, name: "Transferência", type: "TRANSFER" } },
                  update: {},
                  create: { name: "Transferência", type: "TRANSFER", workspaceId, icon: "ArrowRightLeft", color: "#64748b" }
              });

              const t = await tx.transaction.create({
                  data: {
                      description: `Transferência: ${sourceAcc.name} > ${destAcc.name}`,
                      amount,
                      type: 'TRANSFER',
                      date,
                      workspaceId,
                      bankAccountId: acc1.id,
                      recipientAccountId: acc2.id,
                      isPaid: true,
                      categoryId: category.id
                  }
              });
              console.log(`Transação Criada: ${t.id}`);

              await tx.bankAccount.update({ where: { id: acc1.id }, data: { balance: { decrement: amount } } });
              await tx.bankAccount.update({ where: { id: acc2.id }, data: { balance: { increment: amount } } });
          });
    } catch (e) { console.error("Erro na criação:", e); }

    // 4. Verificar Saldos Pós-Transferência
    const acc1Pos = await prisma.bankAccount.findUnique({ where: { id: acc1.id } });
    const acc2Pos = await prisma.bankAccount.findUnique({ where: { id: acc2.id } });
    console.log(`Saldos Pós-Transf: A=${acc1Pos?.balance}, B=${acc2Pos?.balance}`);

    // Check se A=900, B=100

    // 5. Verificar Quantidade de Transações
    const txCount = await prisma.transaction.count({ where: { workspaceId } });
    console.log(`Total Transações: ${txCount}`);

    const transactions = await prisma.transaction.findMany({ where: { workspaceId } });
    const txId = transactions[0].id;

    // 6. Simular Delete
    // LÓGICA COPIADA DA ACTION `deleteTransaction`
    try {
        const t = await prisma.transaction.findUnique({ where: { id: txId } });
        if(t) {
            await prisma.$transaction(async (tx) => {
                if (t.isPaid && t.bankAccountId) {
                    if (t.type === 'TRANSFER' && t.recipientAccountId) {
                        console.log("Revertendo Origem...");
                        await tx.bankAccount.update({ where: { id: t.bankAccountId }, data: { balance: { increment: t.amount } } });
                    }
                }

                if (t.isPaid && t.recipientAccountId && t.type === 'TRANSFER') {
                    console.log("Revertendo Destino...");
                    await tx.bankAccount.update({ where: { id: t.recipientAccountId }, data: { balance: { decrement: t.amount } } });
                }

                await tx.transaction.delete({ where: { id: txId } });
            });
            console.log("Transação Deletada.");
        }
    } catch(e) { console.error("Erro ao apagar:", e); }

    // 7. Verificar Saldos Finais
    const acc1Final = await prisma.bankAccount.findUnique({ where: { id: acc1.id } });
    const acc2Final = await prisma.bankAccount.findUnique({ where: { id: acc2.id } });
    console.log(`Saldos Finais: A=${acc1Final?.balance}, B=${acc2Final?.balance}`);

    // Check se voltou para 1000 e 0

    // Limpeza
    await prisma.transaction.deleteMany({ where: { workspaceId } });
    await prisma.bankAccount.deleteMany({ where: { workspaceId } });
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
