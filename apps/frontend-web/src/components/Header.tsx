'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import MyERPLogo from './MyERPLogo';
import NepaliCalendar from './NepaliCalendar';
import { Calendar, X } from 'lucide-react';
import { adToBs, formatBsDate } from '../lib/nepali-date';

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
  '/general-ledger/day-book': 'Day Begin / Day End',
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
  const [showUtilities, setShowUtilities] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<{ ad: string; bs: string; systemDate?: Date }>({ ad: '', bs: '' });
  const [dayStatus, setDayStatus] = useState<{ status: string; date?: Date } | null>(null);

  // Fetch system date from DayBook (active day)
  useEffect(() => {
    const fetchSystemDate = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/cbs/day-book/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OPEN' && data.date) {
            const systemDate = new Date(data.date);
            const adDate = systemDate.toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            });
            const bsDate = formatBsDate(adToBs(systemDate));
            setCurrentDate({ ad: adDate, bs: bsDate, systemDate });
            setDayStatus({ status: data.status, date: systemDate });
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching system date:', error);
      }

      // Fallback to current date if no active day
      const now = new Date();
      const adDate = now.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      const bsDate = formatBsDate(adToBs(now));
      setCurrentDate({ ad: adDate, bs: bsDate });
      setDayStatus(null);
    };

    fetchSystemDate();
    // Update every minute
    const interval = setInterval(fetchSystemDate, 60000);
    return () => clearInterval(interval);
  }, []);

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
    const breadcrumbs: Array<{ label: string; href: string | null }> = [];

    // Only show breadcrumbs if we're not on the dashboard
    if (paths.length > 0 && pathname !== '/dashboard') {
      // Always start with Dashboard
      breadcrumbs.push({ label: 'Dashboard', href: '/dashboard' });

      // Build breadcrumbs from path segments
      paths.forEach((path, index) => {
        const fullPath = '/' + paths.slice(0, index + 1).join('/');
        const label = pageTitles[fullPath] || path.charAt(0).toUpperCase() + path.slice(1);
        
        // Only add if it's not the last item (last item is the current page, shown as title)
        if (index < paths.length - 1) {
          breadcrumbs.push({ label, href: fullPath });
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
            {breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-1 text-sm text-gray-500 mb-1">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    {index > 0 && <span className="text-gray-400">/</span>}
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
            )}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
              {currentDate.ad && (
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-700">{currentDate.ad}</div>
                      <div className="text-xs text-gray-500">{currentDate.bs}</div>
                    </div>
                    {dayStatus?.status === 'OPEN' && (
                      <span className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded font-medium">
                        Day Open
                      </span>
                    )}
                    {!dayStatus && (
                      <span className="px-2 py-0.5 text-[10px] bg-yellow-100 text-yellow-700 rounded font-medium">
                        No Day
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
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

            {/* Calendar Box */}
            <div className="relative">
              <button
                onClick={() => setShowUtilities(!showUtilities)}
                className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors"
                title="Calendar"
              >
                <Calendar className="h-6 w-6" />
              </button>

              {/* Calendar Dropdown */}
              {showUtilities && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUtilities(false)} />
                  <div className="absolute right-0 mt-2 w-80 rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-20">
                    <div className="p-3">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Calendar</h3>
                        <button
                          onClick={() => setShowUtilities(false)}
                          className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Calendar Section */}
                      <div className="border-t border-gray-200 pt-2">
                        <NepaliCalendar
                          selectedDate={selectedDate}
                          onDateSelect={(adDate, bsDate) => {
                            setSelectedDate(adDate);
                            console.log('Selected AD Date:', adDate);
                            console.log('Selected BS Date:', bsDate);
                          }}
                        />
                        {selectedDate && (
                          <div className="mt-2 p-1.5 bg-gray-50 rounded text-[10px] text-gray-600">
                            Selected: {selectedDate}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

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
