'use client';

import { useEffect, useState, useCallback, ElementType } from 'react';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import {
  Users,
  PiggyBank,
  Banknote,
  Briefcase,
  Package,
  CreditCard,
  Calendar,
  ArrowUpRight,
  FileText,
  UserPlus,
  Wallet,
  Settings,
  HelpCircle,
} from 'lucide-react';
import MemberGrowthChart from '@/components/charts/MemberGrowthChart';
import TrendsChart from '@/components/charts/TrendsChart';
import { format } from 'date-fns';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

interface Stats {
  members?: number;
  savingsAccounts?: number;
  loans?: number;
  employees?: number;
}

export default function DashboardPage() {
  const { user, cooperative, hasModule, token } = useAuth();
  const [stats, setStats] = useState<Stats>({});
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!token) return;

    setIsLoadingStats(true);
    const newStats: Stats = {};

    try {
      // Fetch members count (using fast summary endpoint)
      try {
        const data = await apiClient.get<{ membersWithCapitalLedger?: number }>(
          '/members/summary',
          {
            skipErrorToast: true, // Don't show toast for optional stats
          }
        );
        newStats.members = data.membersWithCapitalLedger || 0;
      } catch {
        // Members endpoint might not exist yet - ignore
      }

      // Fetch savings accounts if CBS enabled
      if (hasModule('cbs')) {
        try {
          const data = await apiClient.get<{ accounts?: unknown[] }>('/savings/accounts', {
            skipErrorToast: true,
          });
          newStats.savingsAccounts = data.accounts?.length || 0;
        } catch {
          // Ignore errors
        }

        try {
          const data = await apiClient.get<{ applications?: unknown[] }>('/loans/applications', {
            skipErrorToast: true,
          });
          newStats.loans = data.applications?.length || 0;
        } catch {
          // Ignore errors
        }
      }

      // Fetch employees if HRM enabled
      if (hasModule('hrm')) {
        try {
          const data = await apiClient.get<{ employees?: unknown[] }>('/hrm/employees', {
            skipErrorToast: true,
          });
          newStats.employees = data.employees?.length || 0;
        } catch {
          // Ignore errors
        }
      }
    } catch {
      // Error handling is done by API client
    } finally {
      setStats(newStats);
      setIsLoadingStats(false);
    }
  }, [token, hasModule]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const currentDate = format(new Date(), 'EEEE, MMMM do, yyyy');

  return (
    <ProtectedRoute>
      <OnboardingWizard />
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {currentDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">System Operational</span>
            </div>
          </div>
        </div>

        {/* Welcome Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-pink-500 opacity-20 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Good Morning, {user?.firstName}! 👋</h2>
            <p className="text-indigo-100 max-w-xl text-lg">
              Here is what&apos;s happening in{' '}
              <span className="font-semibold text-white">{cooperative?.name}</span> today. You have{' '}
              {cooperative?.enabledModules?.length || 0} active modules running.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/members/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium transition-colors border border-white/10"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium transition-colors border border-white/10"
              >
                <FileText className="w-4 h-4" />
                View Reports
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Members"
            value={isLoadingStats ? '...' : (stats.members?.toLocaleString() ?? '0')}
            label="Active Accounts"
            icon={Users}
            color="blue"
            href="/members"
          />
          {hasModule('cbs') && (
            <>
              <StatsCard
                title="Savings Accounts"
                value={isLoadingStats ? '...' : (stats.savingsAccounts?.toLocaleString() ?? '0')}
                label="Total Deposits"
                icon={PiggyBank}
                color="green"
                href="/savings"
              />
              <StatsCard
                title="Active Loans"
                value={isLoadingStats ? '...' : (stats.loans?.toLocaleString() ?? '0')}
                label="Loan Applications"
                icon={Banknote}
                color="amber"
                href="/loans"
              />
            </>
          )}
          {hasModule('hrm') ? (
            <StatsCard
              title="Employees"
              value={isLoadingStats ? '...' : (stats.employees?.toLocaleString() ?? '0')}
              label="Staff Members"
              icon={Briefcase}
              color="purple"
              href="/employees"
            />
          ) : (
            <StatsCard
              title="Active Modules"
              value={cooperative?.enabledModules?.length.toString() || '0'}
              label="System Features"
              icon={Package}
              color="gray"
              href="/subscription"
            />
          )}
        </div>

        {/* Analytics & Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Member Growth</h3>
                  <p className="text-sm text-gray-500">New member registrations over time</p>
                </div>
                <SelectPeriod />
              </div>
              <div className="h-[300px] w-full">
                <MemberGrowthChart />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Workflow Analytics</h3>
                <p className="text-sm text-gray-500">Processing times and status breakdown</p>
              </div>
              <div className="h-[300px] w-full">
                <TrendsChart />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <QuickActionButton
                  icon={UserPlus}
                  label="New Member"
                  href="/members/new"
                  color="text-blue-600 bg-blue-50"
                />
                {hasModule('cbs') && (
                  <>
                    <QuickActionButton
                      icon={Wallet}
                      label="Deposit"
                      href="/savings/deposit"
                      color="text-green-600 bg-green-50"
                    />
                    <QuickActionButton
                      icon={CreditCard}
                      label="Withdraw"
                      href="/savings/withdraw"
                      color="text-red-600 bg-red-50"
                    />
                  </>
                )}
                <QuickActionButton
                  icon={FileText}
                  label="Reports"
                  href="/reports"
                  color="text-purple-600 bg-purple-50"
                />
                <QuickActionButton
                  icon={Settings}
                  label="Settings"
                  href="/settings"
                  color="text-gray-600 bg-gray-50"
                />
                <QuickActionButton
                  icon={HelpCircle}
                  label="Support"
                  href="/support"
                  color="text-indigo-600 bg-indigo-50"
                />
              </div>
            </div>

            {/* Enabled Modules List */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Modules</h3>
                <Link
                  href="/subscription"
                  className="text-sm text-indigo-600 font-medium hover:underline"
                >
                  Manage
                </Link>
              </div>
              <div className="space-y-3">
                {cooperative?.enabledModules?.map((mod) => (
                  <div
                    key={mod}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${getModuleColor(mod)}`}
                    >
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {getModuleName(mod)}
                      </p>
                      <p className="text-xs text-gray-500">Active</p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                ))}
                {(!cooperative?.enabledModules || cooperative.enabledModules.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No active modules</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Sub-components for cleaner code
function StatsCard({
  title,
  value,
  label,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: string;
  label: string;
  icon: ElementType;
  color: string;
  href?: string;
}) {
  const colorStyles: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    gray: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
  };

  return (
    <Link href={href || '#'}>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer h-full group">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {value}
            </h3>
          </div>
          <div className={`p-3 rounded-xl ${colorStyles[color]} transition-colors`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-xs font-medium text-gray-400">
          <ArrowUpRight className="w-3 h-3 mr-1 text-green-500" />
          <span className="text-green-500 mr-2">Calculated</span>
          {label}
        </div>
      </div>
    </Link>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  href,
  color,
}: {
  icon: ElementType;
  label: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 group"
    >
      <div className={`p-3 rounded-lg ${color} mb-2 group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-gray-600 text-center group-hover:text-gray-900">
        {label}
      </span>
    </Link>
  );
}

function SelectPeriod() {
  return (
    <select className="text-sm border-gray-200 rounded-lg text-gray-500 focus:ring-indigo-500 focus:border-indigo-500">
      <option>This Week</option>
      <option>This Month</option>
      <option>This Year</option>
    </select>
  );
}

function getModuleColor(mod: string) {
  const map: Record<string, string> = {
    cbs: 'bg-green-100 text-green-600',
    hrm: 'bg-purple-100 text-purple-600',
    dms: 'bg-blue-100 text-blue-600',
    governance: 'bg-orange-100 text-orange-600',
    inventory: 'bg-yellow-100 text-yellow-600',
    compliance: 'bg-red-100 text-red-600',
  };
  return map[mod] || 'bg-gray-100 text-gray-600';
}

function getModuleName(mod: string) {
  const map: Record<string, string> = {
    cbs: 'Core Banking',
    hrm: 'HR & Payroll',
    dms: 'Documents',
    governance: 'Governance',
    inventory: 'Inventory',
    compliance: 'Compliance',
  };
  return map[mod] || mod;
}
