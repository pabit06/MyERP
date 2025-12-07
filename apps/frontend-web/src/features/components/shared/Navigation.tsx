'use client';

import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { usePathname } from 'next/navigation';

// Pages where navigation should be hidden
const HIDE_NAV_PAGES = ['/login', '/register'];

interface NavItem {
  label: string;
  href: string;
  module?: string;
  icon?: string;
  role?: string;
}

const navigationItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Members', href: '/members', icon: '👥' },
  { label: 'Subscription', href: '/subscription', icon: '💳' },
  // CBS Module
  { label: 'Savings', href: '/savings', module: 'cbs', icon: '💰' },
  { label: 'Loans', href: '/loans', module: 'cbs', icon: '🏦' },
  { label: 'Shares', href: '/shares', module: 'cbs', icon: '📈' },
  // DMS Module
  { label: 'Documents', href: '/documents', module: 'dms', icon: '📄' },
  // HRM Module
  { label: 'Employees', href: '/employees', module: 'hrm', icon: '👔' },
  { label: 'Payroll', href: '/payroll', module: 'hrm', icon: '💵' },
  { label: 'Attendance', href: '/attendance', module: 'hrm', icon: '⏰' },
  { label: 'Training', href: '/hrm/training', module: 'hrm', icon: '📚' },
  // Governance Module
  { label: 'Meetings', href: '/governance/meetings', module: 'governance', icon: '🤝' },
  // Inventory Module
  { label: 'Inventory', href: '/inventory', module: 'inventory', icon: '📦' },
  // Compliance Module
  { label: 'Compliance', href: '/compliance', module: 'compliance', icon: '🛡️' },
];

export default function Navigation() {
  const { isAuthenticated, hasModule, logout, user, cooperative } = useAuth();
  const pathname = usePathname();

  // Hide navigation on auth pages or if not authenticated
  if (!isAuthenticated || HIDE_NAV_PAGES.includes(pathname || '')) {
    return null;
  }

  // Filter navigation items based on enabled modules and role
  const visibleItems = navigationItems.filter((item) => {
    if (!item.module) return true; // Always show items without module requirement
    if (!hasModule(item.module)) return false; // Must have module enabled

    // Check role requirement
    if (item.role) {
      const userRole = user?.role?.name;
      if (!userRole || userRole !== item.role) return false;
    }

    return true;
  });

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/dashboard" className="text-xl font-bold">
                MyERP
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-300">
                {user?.firstName} {user?.lastName}
              </span>
              {cooperative && <span className="text-gray-500 ml-2">({cooperative.name})</span>}
            </div>
            <button
              onClick={logout}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
