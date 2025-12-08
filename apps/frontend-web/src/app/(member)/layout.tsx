import { Inter } from 'next/font/google';
import '../globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-screen bg-slate-50 ${inter.className}`}>
      {/* Dedicated Member Layout - simplified for now, no complex sidebar yet */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold text-teal-700">MyCoop Member</span>
        </div>
        <nav>
          <a href="/member/login" className="text-sm text-gray-600 hover:text-teal-600">
            Login
          </a>
        </nav>
      </header>
      <main className="p-6">{children}</main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
