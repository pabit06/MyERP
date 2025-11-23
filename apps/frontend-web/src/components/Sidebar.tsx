'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MyERPLogo from './MyERPLogo';
import { cn } from '../lib/utils';

// Import Professional Icons
import {
  LayoutDashboard,
  Users,
  PiggyBank,
  Banknote,
  PieChart,
  FileText,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Vote,
  Package,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Settings,
  Menu,
  Search,
  AlertTriangle,
  UserCheck,
  BarChart3,
  Plus,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  TrendingDown,
  ArrowDown,
  Award,
  Activity,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

// Type for Lucide icons
type LucideIcon = ComponentType<LucideProps>;

// Pages where sidebar should be hidden
const HIDE_SIDEBAR_PAGES = ['/login', '/register', '/forgot-password'];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Type Definitions
interface NavItem {
  label: string;
  href: string;
  module?: string;
  icon: LucideIcon;
  group?: string;
  submenu?: NavItem[];
  // Removed 'badge' from here as it's dynamic
  role?: string;
}

export default function Sidebar() {
  const { isAuthenticated, hasModule, user, token, isLoading } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  // State for all dynamic badges
  const [badges, setBadges] = useState<{ [key: string]: number }>({
    kyc: 0,
    loans: 0,
  });

  // 1. Define Navigation Configuration
  const navigationItems: NavItem[] = useMemo(
    () => [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'main' },

      // --- CBS Module ---
      {
        label: 'Members',
        href: '/members',
        icon: Users,
        group: 'banking',
        submenu: [
          { label: 'Member Dashboard', href: '/members', icon: LayoutDashboard },
          { label: 'All Members', href: '/members/all', icon: Users },
          { label: 'New Member', href: '/members/new', icon: Plus },
          { label: 'Member Approval', href: '/members/kyc-approvals', icon: CheckCircle2 },
        ],
      },
      {
        label: 'Shares',
        href: '/shares',
        module: 'cbs',
        icon: PieChart,
        group: 'banking',
        submenu: [
          { label: 'Dashboard', href: '/shares', icon: LayoutDashboard },
          { label: 'Issue Share', href: '/shares/issue', icon: Plus },
          { label: 'Return Share', href: '/shares/return', icon: ArrowDown },
          { label: 'Statement', href: '/shares/statement', icon: FileText },
          { label: 'Certificates', href: '/shares/certificates', icon: Award },
          { label: 'Share Register', href: '/shares/register', icon: BookOpen },
        ],
      },
      { label: 'Savings', href: '/savings', module: 'cbs', icon: PiggyBank, group: 'banking' },
      { label: 'Loans', href: '/loans', module: 'cbs', icon: Banknote, group: 'banking' },
      {
        label: 'General Ledger',
        href: '/general-ledger',
        module: 'cbs',
        icon: BookOpen,
        group: 'banking',
        submenu: [
          { label: 'Dashboard', href: '/general-ledger', icon: LayoutDashboard },
          { label: 'Assets', href: '/general-ledger/assets', icon: TrendingUp },
          { label: 'Liabilities', href: '/general-ledger/liabilities', icon: TrendingDown },
          { label: 'Equity', href: '/general-ledger/equity', icon: Activity },
          { label: 'Expenses', href: '/general-ledger/expenses', icon: ArrowDown },
          { label: 'Income', href: '/general-ledger/income', icon: Plus },
        ],
      },
      {
        label: 'Reports',
        href: '/reports',
        module: 'cbs',
        icon: BarChart3,
        group: 'banking',
        submenu: [
          { label: 'Dashboard', href: '/reports', icon: LayoutDashboard },
          { label: 'Member Reports', href: '/reports/member', icon: Users },
          { label: 'Savings Reports', href: '/reports/savings', icon: PiggyBank },
          { label: 'Loan Reports', href: '/reports/loan', icon: Banknote },
          { label: 'Financial Statements', href: '/reports/financial-statements', icon: FileText },
          { label: 'Audit Report', href: '/reports/audit', icon: ShieldAlert },
        ],
      },

      // --- Operations ---
      {
        label: 'Documents',
        href: '/documents',
        module: 'dms',
        icon: FileText,
        group: 'operations',
        submenu: [
          { label: 'All Documents', href: '/documents', icon: FileText },
          { label: 'Darta / Chalani (दर्ता / चलानी)', href: '/documents/darta-chalani', icon: FileText },
        ],
      },
      {
        label: 'Inventory',
        href: '/inventory',
        module: 'inventory',
        icon: Package,
        group: 'operations',
      },

      // --- HRM ---
      {
        label: 'HR Management',
        href: '/hrm',
        module: 'hrm',
        icon: Briefcase,
        group: 'operations',
        submenu: [
          { label: 'Dashboard', href: '/hrm/dashboard', icon: LayoutDashboard },
          { label: 'Employees', href: '/hrm/employees', icon: Users },
          { label: 'Attendance', href: '/hrm/attendance', icon: CalendarDays },
          { label: 'Leave', href: '/hrm/leave', icon: CalendarDays },
          { label: 'Payroll', href: '/hrm/payroll', icon: Banknote },
          { label: 'Settings', href: '/hrm/settings', icon: Settings },
        ],
      },

      // --- Governance ---
      {
        label: 'Committees',
        href: '/governance/committees',
        module: 'governance',
        icon: Building2,
        group: 'governance',
      },
      {
        label: 'Board Meetings',
        href: '/governance/meetings',
        module: 'governance',
        icon: CalendarDays,
        group: 'governance',
      },
      {
        label: "Manager's Reports",
        href: '/governance/reports',
        module: 'governance',
        icon: ClipboardList,
        group: 'governance',
      },
      {
        label: 'AGM',
        href: '/governance/agm',
        module: 'governance',
        icon: Vote,
        group: 'governance',
      },

      // --- Compliance ---
      {
        label: 'Compliance',
        href: '/compliance',
        module: 'compliance',
        icon: ShieldAlert,
        group: 'operations',
        submenu: [
          { label: 'Audit Logs', href: '/compliance', icon: Search },
          {
            label: 'Dashboard',
            href: '/compliance/dashboard',
            icon: LayoutDashboard,
            role: 'ComplianceOfficer',
          },
          {
            label: 'TTR Queue',
            href: '/compliance/ttr-queue',
            icon: ClipboardList,
            role: 'ComplianceOfficer',
          },
          {
            label: 'Suspicious Cases',
            href: '/compliance/cases',
            icon: AlertTriangle,
            role: 'ComplianceOfficer',
          },
          {
            label: 'KYM Status',
            href: '/compliance/kym-status',
            icon: UserCheck,
            role: 'ComplianceOfficer',
          },
          {
            label: 'Risk Report',
            href: '/compliance/risk-report',
            icon: BarChart3,
            role: 'ComplianceOfficer',
          },
        ],
      },
    ],
    []
  );

  const groupLabels: Record<string, string> = {
    main: 'Overview',
    banking: 'Core Banking',
    operations: 'Operations',
    governance: 'Governance',
  };

  // 2. Fetch Badges (Centralized Logic)
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const fetchBadges = async () => {
      try {
        // You can create a combined endpoint later like /api/dashboard/badges
        const response = await fetch(`${API_URL}/members/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setBadges((prev) => ({ ...prev, kyc: data.pendingKYC || 0 }));
        }
      } catch (error) {
        console.error('Error fetching badges:', error);
      }
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, 300000); // 5 mins
    return () => clearInterval(interval);
  }, [token, isAuthenticated]);

  // 3. Map badges to Routes (Scalable way)
  const getBadgeCount = (href: string): number => {
    const badgeMap: Record<string, number> = {
      '/members/kyc-approvals': badges.kyc,
      // Future badges:
      // '/loans/pending': badges.loans,
    };
    return badgeMap[href] || 0;
  };

  // 4. Auto-expand logic
  useEffect(() => {
    navigationItems.forEach((item) => {
      if (item.submenu) {
        const isActive = item.submenu.some(
          (sub) => pathname === sub.href || pathname?.startsWith(sub.href + '/')
        );
        if (isActive) setExpandedMenus((prev) => new Set(prev).add(item.href));
      }
    });
  }, [pathname, navigationItems]);

  const toggleSubmenu = (href: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  };

  // Prevent flashing while checking auth
  if (isLoading) return null;
  if (!isAuthenticated || HIDE_SIDEBAR_PAGES.includes(pathname || '')) return null;

  // 5. Filter Logic (Modules & Roles)
  const filteredGroups = navigationItems
    .filter((item) => {
      if (item.module && !hasModule(item.module)) return false;
      if (item.role && user?.role?.name !== item.role) return false;
      return true;
    })
    .map((item) => {
      if (item.submenu) {
        return {
          ...item,
          submenu: item.submenu.filter((subItem) => {
            if (subItem.role) {
              return user?.role?.name === subItem.role;
            }
            return true;
          }),
        };
      }
      return item;
    })
    .reduce(
      (acc, item) => {
        const group = item.group || 'other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
      },
      {} as Record<string, NavItem[]>
    );

  return (
    <>
      {/* Mobile Trigger */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out shadow-xl md:shadow-none',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header / Logo */}
        <div className="h-24 flex items-center px-6 border-b border-gray-100">
          <MyERPLogo size="2xl" />
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden ml-auto text-gray-400 hover:text-gray-600"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
          {Object.entries(filteredGroups).map(([group, items]) => (
            <div key={group}>
              {groupLabels[group] && (
                <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 font-sans">
                  {groupLabels[group]}
                </h3>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <SidebarItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    isExpanded={expandedMenus.has(item.href)}
                    onToggle={() => toggleSubmenu(item.href)}
                    // Pass the generic badge getter
                    getBadge={getBadgeCount}
                    closeMobile={() => setIsMobileMenuOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

// Extracted Sidebar Item Component
function SidebarItem({
  item,
  pathname,
  isExpanded,
  onToggle,
  getBadge,
  closeMobile,
}: {
  item: NavItem;
  pathname: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  getBadge: (href: string) => number;
  closeMobile: () => void;
}) {
  const Icon = item.icon;
  const hasSubmenu = item.submenu && item.submenu.length > 0;
  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

  // Get dynamic badge count
  const badgeCount = getBadge(item.href);

  const baseLinkClasses = cn(
    'group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative',
    isActive
      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  );

  return (
    <div className="mb-1">
      {hasSubmenu ? (
        <button onClick={onToggle} className={cn(baseLinkClasses, 'w-full')}>
          <div className="flex items-center gap-3">
            <Icon
              className={cn(
                'w-5 h-5',
                isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
              )}
            />
            <span>{item.label}</span>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-200',
              isExpanded ? 'rotate-180' : ''
            )}
          />
        </button>
      ) : (
        <Link href={item.href} onClick={closeMobile} className={baseLinkClasses}>
          <div className="flex items-center gap-3">
            <Icon
              className={cn(
                'w-5 h-5',
                isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
              )}
            />
            <span>{item.label}</span>
          </div>
          {/* Dynamic Badge */}
          {badgeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
              {badgeCount}
            </span>
          )}
        </Link>
      )}

      {/* Submenu Render */}
      {hasSubmenu && (
        <div
          className={cn(
            'grid transition-all duration-200 ease-in-out overflow-hidden',
            isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="min-h-0 pl-4 border-l-2 border-gray-100 ml-5 space-y-1">
            {item.submenu!.map((subItem) => (
              <SidebarItem
                key={subItem.href}
                item={subItem}
                pathname={pathname}
                isExpanded={false}
                onToggle={() => {}}
                getBadge={getBadge}
                closeMobile={closeMobile}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
