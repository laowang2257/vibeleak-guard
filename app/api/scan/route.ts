import { NextResponse } from 'next/server';
import { z } from 'zod';
import { scanUrl } from '@/lib/scanner';
import { createReport } from '@/lib/store';

const Body = z.object({ url: z.string().url().max(400) });

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const scan = await scanUrl(body.url);
    const report = await createReport(scan);
    return NextResponse.json({ id: report.id, score: report.score, summary: report.summary, findingsCount: report.findings.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'スキャンに失敗しました';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
