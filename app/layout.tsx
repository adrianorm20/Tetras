import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthContext';
import AuthModal from '@/components/AuthModal';
import AppNavbar from '@/components/AppNavbar';

export const metadata: Metadata = {
  title: 'TETR.IO Adriano // Next.js Modern Tetris',
  description: 'Competitive web-based modern Tetris engine built with Next.js App Router, Tailwind CSS, and HTML5 Canvas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#05060b] text-slate-100 antialiased relative">
        <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />
        <div className="fixed -top-32 left-[15%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none z-0" />
        <div className="fixed -bottom-32 right-[15%] w-[450px] h-[450px] rounded-full bg-pink-500/10 blur-[130px] pointer-events-none z-0" />
        
        <AuthProvider>
          <div className="relative z-10">
            <AppNavbar />
            {children}
          </div>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
