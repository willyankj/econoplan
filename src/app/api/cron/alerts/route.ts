import { NextResponse } from 'next/server';
import { checkDeadlinesAndSendAlerts } from '@/app/dashboard/actions/planning';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[CRON ALERTS] Verificando prazos...`);
    try {
        const result = await checkDeadlinesAndSendAlerts();
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}