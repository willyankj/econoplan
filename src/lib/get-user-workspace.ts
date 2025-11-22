import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from 'next/headers';

export async function getUserWorkspace() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { workspaces: true }
  });

  if (!user || user.workspaces.length === 0) {
    return { user, workspaceId: "", error: "Sem workspace" };
  }

  // Lógica do Cookie (Para o Next.js 15, cookies() é promise)
  const cookieStore = await cookies();
  const activeWorkspaceCookie = cookieStore.get('activeWorkspaceId')?.value;
  
  let workspaceId = user.workspaces[0].workspaceId;
  
  // Verifica se o cookie é válido e se o usuário tem acesso a esse workspace
  if (activeWorkspaceCookie) {
    const hasAccess = user.workspaces.find(w => w.workspaceId === activeWorkspaceCookie);
    if (hasAccess) {
      workspaceId = activeWorkspaceCookie;
    }
  }

  return { user, workspaceId };
}
