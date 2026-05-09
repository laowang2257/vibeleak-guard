import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ScanReport } from './scanner';

const DATA_FILE = path.join(process.cwd(), 'data', 'reports.json');

async function readAll(): Promise<ScanReport[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw) as ScanReport[];
  } catch {
    return [];
  }
}

async function writeAll(reports: ScanReport[]) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(reports, null, 2));
}

export async function createReport(report: Omit<ScanReport, 'id' | 'createdAt' | 'paid'>) {
  const reports = await readAll();
  const full: ScanReport = {
    ...report,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    paid: false
  };
  reports.unshift(full);
  await writeAll(reports.slice(0, 500));
  return full;
}

export async function getReport(id: string) {
  const reports = await readAll();
  return reports.find((r) => r.id === id) || null;
}

export async function markPaid(id: string, checkoutSessionId: string) {
  const reports = await readAll();
  const idx = reports.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  reports[idx] = { ...reports[idx], paid: true, checkoutSessionId };
  await writeAll(reports);
  return reports[idx];
}
