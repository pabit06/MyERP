'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import Link from 'next/link';
import MyERPLogo from './MyERPLogo';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/members': 'Members',
  '/subscription': 'Subscription',
  '/savings': 'Savings',
  '/loans': 'Loans',
  '/shares': 'Shares',
  '/general-ledger': 'General Ledger',
  '/general-ledger/assets': 'Assets',
  '/general-ledger/liabilities': 'Liabilities',
  '/general-ledger/equity': 'Equity',
  '/general-ledger/expenses': 'Expenses',
  '/general-ledger/income': 'Income',
  '/general-ledger/statement': 'Ledger Statement',
  '/documents': 'Documents',
  '/employees': 'Employees',
  '/payroll': 'Payroll',
  '/attendance': 'Attendance',
  '/governance/meetings': 'Meetings',
  '/meetings': 'Meetings', // Keep for backward compatibility (redirects to /governance/meetings)
  '/inventory': 'Inventory',
  '/compliance': 'Compliance & Audit',
};

export default function Header() {
  const pathname = usePathname();
  const { user, cooperative, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getPageTitle = () => {
    if (pathname) {
      // Check for exact match first
      if (pageTitles[pathname]) {
        return pageTitles[pathname];
      }
      // Check for paths that start with a key
      for (const [key, title] of Object.entries(pageTitles)) {
        if (pathname.startsWith(key + '/')) {
          return title;
        }
      }
    }
    return 'MyERP';
  };

  const getBreadcrumbs = () => {
    const paths = pathname?.split('/').filter(Boolean) || [];
    const breadcrumbs = [{ label: 'Dashboard', href: '/dashboard' }];

    if (paths.length > 1) {
      paths.forEach((path, index) => {
        const fullPath = '/' + paths.slice(0, index + 1).join('/');
        const label = pageTitles[fullPath] || path.charAt(0).toUpperCase() + path.slice(1);
        if (index < paths.length - 1) {
          breadcrumbs.push({ label, href: fullPath });
        } else {
          breadcrumbs.push({ label, href: null });
        }
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Breadcrumbs and Title */}
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-1">
              <MyERPLogo size="md" showText={false} />
              {cooperative?.name && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">|</span>
                  {cooperative.logoUrl && (
                    <img
                      src={cooperative.logoUrl}
                      alt={cooperative.name}
                      className="h-6 w-6 rounded object-cover"
                    />
                  )}
                  <span className="text-sm font-medium text-indigo-600">{cooperative.name}</span>
                </div>
              )}
            </div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {index > 0 && <span>/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-gray-700 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-900 font-medium">{crumb.label}</span>
                  )}
                </div>
              ))}
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications (placeholder) */}
            <button className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-[150px]">
                    {cooperative?.name}
                  </p>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400 hidden md:block"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                        <p className="text-xs text-gray-400 mt-1">{cooperative?.name}</p>
                      </div>
                      <Link
                        href="/subscription"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        💳 Subscription
                      </Link>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        ⚙️ Settings
                      </Link>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
