'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MyERPLogo from './MyERPLogo';
import { cn } from '../lib/utils';
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
  LogOut,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

type LucideIcon = ComponentType<LucideProps>;

const HIDE_SIDEBAR_PAGES = ['/login', '/register', '/forgot-password'];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface NavItem {
  label: string;
  href: string;
  module?: string;
  icon: LucideIcon;
  group?: string;
  submenu?: NavItem[];
  role?: string;
}

export default function Sidebar() {
  const { isAuthenticated, hasModule, user, token, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [badges, setBadges] = useState<{ [key: string]: number }>({
    kyc: 0,
    loans: 0,
  });

  const navigationItems: NavItem[] = useMemo(
    () => [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'main' },
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
          { label: 'Day Begin/End', href: '/general-ledger/day-book', icon: CalendarDays },
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
      {
        label: 'Documents',
        href: '/documents',
        module: 'dms',
        icon: FileText,
        group: 'operations',
        submenu: [
          { label: 'All Documents', href: '/documents', icon: FileText },
          {
            label: 'Darta / Chalani',
            href: '/documents/darta-chalani',
            icon: FileText,
          },
        ],
      },
      {
        label: 'Inventory',
        href: '/inventory',
        module: 'inventory',
        icon: Package,
        group: 'operations',
      },
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

  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const fetchBadges = async () => {
      try {
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
    const interval = setInterval(fetchBadges, 15000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBadges();
      }
    };

    const handleFocus = () => {
      fetchBadges();
    };

    const handleBadgeRefresh = () => {
      fetchBadges();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('refreshBadges', handleBadgeRefresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('refreshBadges', handleBadgeRefresh);
    };
  }, [token, isAuthenticated]);

  const getBadgeCount = (href: string): number => {
    const badgeMap: Record<string, number> = {
      '/members/kyc-approvals': badges.kyc,
    };
    return badgeMap[href] || 0;
  };

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

  if (isLoading) return null;
  if (!isAuthenticated || HIDE_SIDEBAR_PAGES.includes(pathname || '')) return null;

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
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-background rounded-lg shadow-md border border-border text-foreground hover:text-primary transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-72 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Dark Sidebar Background */}
        <div className="h-20 flex items-center px-6 border-b border-white/10 bg-slate-950">
          <MyERPLogo size="2xl" />
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden ml-auto text-gray-400 hover:text-white"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {Object.entries(filteredGroups).map(([group, items]) => (
            <div key={group}>
              {groupLabels[group] && (
                <h3 className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 font-sans">
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
                    getBadge={getBadgeCount}
                    closeMobile={() => setIsMobileMenuOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer Section */}
        <div className="p-4 border-t border-white/10 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg">
              <span className="font-bold text-sm">{user?.firstName?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

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
  const badgeCount = getBadge(item.href);

  const baseLinkClasses = cn(
    'group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative',
    isActive
      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
      : 'text-slate-400 hover:bg-white/5 hover:text-white'
  );

  return (
    <div className="mb-1">
      {hasSubmenu ? (
        <button onClick={onToggle} className={cn(baseLinkClasses, 'w-full')}>
          <div className="flex items-center gap-3">
            <Icon
              className={cn(
                'w-5 h-5',
                isActive ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'
              )}
            />
            <span>{item.label}</span>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-500 transition-transform duration-200',
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
                isActive ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'
              )}
            />
            <span>{item.label}</span>
          </div>
          {badgeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm ring-2 ring-slate-900">
              {badgeCount}
            </span>
          )}
        </Link>
      )}

      {/* Submenu Render */}
      {hasSubmenu && (
        <div
          className={cn(
            'grid transition-all duration-300 ease-in-out overflow-hidden',
            isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="min-h-0 pl-11 space-y-1 relative">
            {/* Guide Line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10"></div>
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
