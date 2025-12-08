'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

// Pages where layout should be full-width (no sidebar)
const FULL_WIDTH_PAGES = ['/login', '/register'];

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const isMemberPortal = pathname?.startsWith('/member');
  const isFullWidth =
    FULL_WIDTH_PAGES.includes(pathname || '') || !isAuthenticated || isMemberPortal;

  if (isFullWidth) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden md:ml-72">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
