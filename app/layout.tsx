import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'VibeLeak Guard', description: 'Paid client-side secret leak scanner for vibe-coded apps' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
