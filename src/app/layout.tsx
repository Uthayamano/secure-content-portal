import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Secure Content Portal | Protected Reference & Training',
  description:
    'Internal reference and training content portal with strict role-based access, sandboxed rendering, and zero raw file exposure.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full bg-slate-950">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-950 text-slate-100 antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
