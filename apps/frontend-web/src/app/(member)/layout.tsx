'use client';

import { Inter } from 'next/font/google';
import '../globals.css';
import { Toaster } from 'sonner';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/member/login';

  const handleLogout = () => {
    document.cookie = 'member_token=; Max-Age=0; path=/;';
    window.location.href = '/member/login';
  };

  return (
    <div className={`min-h-screen bg-slate-50 ${inter.className}`}>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center space-x-8">
          <Link href="/member/dashboard" className="text-xl font-bold text-teal-700">
            MyCoop Member
          </Link>
          {!isLoginPage && (
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/member/dashboard"
                className={`text-sm font-medium transition-colors hover:text-teal-700 ${
                  pathname === '/member/dashboard' ? 'text-teal-700' : 'text-gray-600'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/member/accounts"
                className={`text-sm font-medium transition-colors hover:text-teal-700 ${
                  pathname === '/member/accounts' ? 'text-teal-700' : 'text-gray-600'
                }`}
              >
                Accounts
              </Link>
              <Link
                href="/member/loans"
                className={`text-sm font-medium transition-colors hover:text-teal-700 ${
                  pathname === '/member/loans' ? 'text-teal-700' : 'text-gray-600'
                }`}
              >
                Loans
              </Link>
            </nav>
          )}
        </div>
        <nav>
          {isLoginPage ? (
            <Link href="/" className="text-sm text-gray-600 hover:text-teal-600">
              Back to Home
            </Link>
          ) : (
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
            >
              Logout
            </button>
          )}
        </nav>
      </header>
      <main className="p-6 md:p-10 max-w-7xl mx-auto">{children}</main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
