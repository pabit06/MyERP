'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import MyERPLogo from './MyERPLogo';
import NepaliCalendar from './NepaliCalendar';
import {
  Calendar,
  X,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CreditCard,
} from 'lucide-react';
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
  const [currentDate, setCurrentDate] = useState<{ ad: string; bs: string; systemDate?: Date }>({
    ad: '',
    bs: '',
  });
  const [dayStatus, setDayStatus] = useState<{ status: string; date?: Date } | null>(null);

  // Fetch system date from DayBook (active day)
  useEffect(() => {
    const fetchSystemDate = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/cbs/day-book/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OPEN' && data.date) {
            const systemDate = new Date(data.date);
            const adDate = systemDate.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
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
        year: 'numeric',
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
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 transition-all duration-200">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Breadcrumbs and Title */}
          <div className="flex-1 min-w-0">
            {/* Mobile Logo for context if sidebar hidden or minimal view */}
            <div className="flex items-center space-x-3 mb-1 md:hidden">
              <MyERPLogo size="sm" showText={false} />
            </div>

            {breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    {index > 0 && <span className="text-gray-300">/</span>}
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-indigo-600 transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-700 font-medium">{crumb.label}</span>
                    )}
                  </div>
                ))}
              </nav>
            )}

            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight truncate">
                {getPageTitle()}
              </h1>
              {/* Search Bar (Optional/Placeholder for future) */}
              <div className="hidden lg:flex items-center relative group">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-indigo-100 transition-all focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Day Status Indicator (Prominent) */}
            {currentDate.ad && (
              <div className="hidden md:flex flex-col items-end mr-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{currentDate.ad}</span>
                  {dayStatus?.status === 'OPEN' ? (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                  )}
                </div>
                <span className="text-xs text-gray-500 font-medium">{currentDate.bs}</span>
              </div>
            )}

            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-200">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>

            {/* Calendar Box */}
            <div className="relative">
              <button
                onClick={() => setShowUtilities(!showUtilities)}
                className={`relative p-2 rounded-full transition-all duration-200 ${showUtilities ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                title="Calendar"
              >
                <Calendar className="h-5 w-5" />
              </button>

              {/* Calendar Dropdown */}
              {showUtilities && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUtilities(false)} />
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-indigo-900">Nepali Calendar</h3>
                      <button
                        onClick={() => setShowUtilities(false)}
                        className="text-indigo-400 hover:text-indigo-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <NepaliCalendar
                        selectedDate={selectedDate}
                        onDateSelect={(adDate) => {
                          setSelectedDate(adDate);
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Menu */}
            <div className="relative pl-2 border-l border-gray-200">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-1 rounded-full hover:bg-gray-50 transition-all duration-200 ring-offset-2 focus:ring-2 focus:ring-indigo-500"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md text-white">
                  <span className="font-bold text-sm">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900 leading-none">
                    {user?.firstName}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium truncate max-w-[100px] mt-1">
                    {cooperative?.name}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 hidden md:block" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 w-full truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 w-full truncate">{user?.email}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-indigo-100 text-indigo-800 mt-2">
                        {user?.role?.name || 'User'}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="group flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="mr-3 h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
                        My Profile
                      </Link>
                      <Link
                        href="/subscription"
                        className="group flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <CreditCard className="mr-3 h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
                        Subscription Plan
                      </Link>
                      <Link
                        href="/settings"
                        className="group flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="mr-3 h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
                        Settings
                      </Link>
                    </div>

                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="group flex w-full items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="mr-3 h-4 w-4 text-red-400 group-hover:text-red-500" />
                        Sign Out
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
