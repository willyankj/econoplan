
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Debugging Balance...");

  // 1. Get all workspaces
  const workspaces = await prisma.workspace.findMany({ include: { accounts: true } });

  for (const ws of workspaces) {
      console.log(`\nWorkspace: ${ws.name} (${ws.id})`);

      let totalBalance = 0;
      for (const acc of ws.accounts) {
          console.log(`  Account: ${acc.name} (${acc.id}) - Balance: ${acc.balance}`);
          totalBalance += Number(acc.balance);

          // Sum transactions
          const income = await prisma.transaction.aggregate({ where: { bankAccountId: acc.id, type: 'INCOME', isPaid: true }, _sum: { amount: true } });
          const expense = await prisma.transaction.aggregate({ where: { bankAccountId: acc.id, type: 'EXPENSE', isPaid: true }, _sum: { amount: true } });
          // Transfers and Vaults?
          // Simplest check: Sum all signed flows?
          // Let's iterate all transactions for this account
          const txs = await prisma.transaction.findMany({ where: { bankAccountId: acc.id, isPaid: true } });
          let calcBalance = 0;
          for (const t of txs) {
              const v = Number(t.amount);
              if (t.type === 'INCOME' || t.type === 'VAULT_WITHDRAW') calcBalance += v;
              else if (t.type === 'EXPENSE' || t.type === 'VAULT_DEPOSIT') calcBalance -= v;
              else if (t.type === 'TRANSFER') calcBalance -= v; // Source
          }

          // Incoming transfers
          const incoming = await prisma.transaction.findMany({ where: { recipientAccountId: acc.id, type: 'TRANSFER', isPaid: true } });
          for (const t of incoming) {
              calcBalance += Number(t.amount);
          }

          console.log(`    Calculated from Txs: ${calcBalance.toFixed(2)}`);
          console.log(`    Diff: ${(Number(acc.balance) - calcBalance).toFixed(2)}`);
      }
      console.log(`  Total WS Balance: ${totalBalance.toFixed(2)}`);
  }
}

main();
