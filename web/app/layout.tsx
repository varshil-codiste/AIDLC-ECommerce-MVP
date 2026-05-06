import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chat-Native E-Commerce — Internal Demo',
  description: 'Chat-only commerce surface — multi-agent MVP.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
