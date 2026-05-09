import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VibeLeak Guard 日本語版',
  description: 'AI / vibe-coded アプリ向けの公開クライアント漏えいスキャナー'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
