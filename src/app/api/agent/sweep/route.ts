import { NextResponse } from 'next/server';
import { runHealthSweep } from '@/services/sweeperService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Autonomous Health Sweeper HTTP Trigger Endpoint
 *
 * 【セキュリティと認証に関する注意】
 * 本エンドポイントはローカル開発環境および内部ネットワーク、または
 * 信頼された外部スケジューラー（GitHub Actions, Vercel Cron等）からの自律巡回トリガーを想定しています。
 * インターネット公開環境で運用する場合は、Cronヘッダー検証（CRON_SECRET等）や
 * リバースプロキシでのアクセス制御を必ず導入してください。
 */
export async function POST() {
  try {
    const report = runHealthSweep();
    return NextResponse.json({
      ok: true,
      data: report,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during sweep';
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

