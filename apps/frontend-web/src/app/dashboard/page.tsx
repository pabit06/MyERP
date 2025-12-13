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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Stats {
  members?: number;
  savingsAccounts?: number;
  loans?: number;
  employees?: number;
}

/**
 * Get time-based greeting based on current hour
 */
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good Evening';
  } else {
    return 'Good Night';
  }
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {currentDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-card px-4 py-2 rounded-full shadow-sm border border-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium text-foreground">System Operational</span>
            </div>
          </div>
        </div>

        {/* Welcome Card */}
        <div className="relative overflow-hidden bg-primary rounded-2xl p-8 text-primary-foreground shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">
              {getTimeBasedGreeting()}, {user?.firstName}! 👋
            </h2>
            <p className="text-primary-foreground/90 max-w-xl text-lg">
              Here is what&apos;s happening in{' '}
              <span className="font-semibold">{cooperative?.name}</span> today. You have{' '}
              {cooperative?.enabledModules?.length || 0} active modules running.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/members/new">
                <Button variant="secondary" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </Button>
              </Link>
              <Link href="/reports">
                <Button
                  variant="secondary"
                  className="gap-2 bg-white/10 hover:bg-white/20 text-white border-0"
                >
                  <FileText className="w-4 h-4" />
                  View Reports
                </Button>
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
            color="bg-blue-500/10 text-blue-500"
            href="/members"
          />
          {hasModule('cbs') && (
            <>
              <StatsCard
                title="Savings Accounts"
                value={isLoadingStats ? '...' : (stats.savingsAccounts?.toLocaleString() ?? '0')}
                label="Total Deposits"
                icon={PiggyBank}
                color="bg-green-500/10 text-green-500"
                href="/savings"
              />
              <StatsCard
                title="Active Loans"
                value={isLoadingStats ? '...' : (stats.loans?.toLocaleString() ?? '0')}
                label="Loan Applications"
                icon={Banknote}
                color="bg-amber-500/10 text-amber-500"
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
              color="bg-purple-500/10 text-purple-500"
              href="/employees"
            />
          ) : (
            <StatsCard
              title="Active Modules"
              value={cooperative?.enabledModules?.length.toString() || '0'}
              label="System Features"
              icon={Package}
              color="bg-gray-500/10 text-gray-500"
              href="/subscription"
            />
          )}
        </div>

        {/* Analytics & Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Member Growth</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    New member registrations over time
                  </p>
                </div>
                <SelectPeriod />
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <MemberGrowthChart />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Analytics</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Processing times and status breakdown
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <TrendsChart />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <QuickActionButton
                    icon={UserPlus}
                    label="New Member"
                    href="/members/new"
                    color="text-blue-600 bg-blue-50 hover:bg-blue-100"
                  />
                  {hasModule('cbs') && (
                    <>
                      <QuickActionButton
                        icon={Wallet}
                        label="Deposit"
                        href="/savings/deposit"
                        color="text-green-600 bg-green-50 hover:bg-green-100"
                      />
                      <QuickActionButton
                        icon={CreditCard}
                        label="Withdraw"
                        href="/savings/withdraw"
                        color="text-red-600 bg-red-50 hover:bg-red-100"
                      />
                    </>
                  )}
                  <QuickActionButton
                    icon={FileText}
                    label="Reports"
                    href="/reports"
                    color="text-purple-600 bg-purple-50 hover:bg-purple-100"
                  />
                  <QuickActionButton
                    icon={Settings}
                    label="Settings"
                    href="/settings"
                    color="text-gray-600 bg-gray-50 hover:bg-gray-100"
                  />
                  <QuickActionButton
                    icon={HelpCircle}
                    label="Support"
                    href="/support"
                    color="text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Enabled Modules List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Modules</CardTitle>
                <Link
                  href="/subscription"
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Manage
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cooperative?.enabledModules?.map((mod) => (
                    <div
                      key={mod}
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          getModuleColor(mod)
                        )}
                      >
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {getModuleName(mod)}
                        </p>
                        <p className="text-xs text-muted-foreground">Active</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  ))}
                  {(!cooperative?.enabledModules || cooperative.enabledModules.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No active modules
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
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
  return (
    <Link href={href || '#'}>
      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer h-full group border-border">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
              <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                {value}
              </h3>
            </div>
            <div className={cn('p-3 rounded-xl transition-colors', color)}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground">
            <ArrowUpRight className="w-3 h-3 mr-1 text-green-500" />
            <span className="text-green-500 mr-2">Calculated</span>
            {label}
          </div>
        </CardContent>
      </Card>
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
      className={cn(
        'flex flex-col items-center justify-center p-4 rounded-xl transition-colors border border-transparent hover:border-border',
        'bg-background/50 hover:bg-accent/50 group' // Use mostly transparent backgrounds or specific colors
      )}
    >
      <div className={cn('p-3 rounded-lg mb-2 group-hover:scale-110 transition-transform', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-muted-foreground text-center group-hover:text-foreground">
        {label}
      </span>
    </Link>
  );
}

function SelectPeriod() {
  return (
    <select className="text-sm border-input bg-background rounded-md text-foreground focus:ring-ring focus:border-ring h-9 px-3">
      <option>This Week</option>
      <option>This Month</option>
      <option>This Year</option>
    </select>
  );
}

function getModuleColor(mod: string) {
  const map: Record<string, string> = {
    cbs: 'bg-green-500/10 text-green-600',
    hrm: 'bg-purple-500/10 text-purple-600',
    dms: 'bg-blue-500/10 text-blue-600',
    governance: 'bg-orange-500/10 text-orange-600',
    inventory: 'bg-yellow-500/10 text-yellow-600',
    compliance: 'bg-red-500/10 text-red-600',
  };
  return map[mod] || 'bg-gray-500/10 text-gray-600';
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
