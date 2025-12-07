'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import {
  Building2,
  Users,
  PiggyBank,
  Banknote,
  Briefcase,
  Package,
  CreditCard,
  TrendingUp,
} from 'lucide-react';

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
        const data = await apiClient.get<{ membersWithCapitalLedger?: number }>('/members/summary', {
          skipErrorToast: true, // Don't show toast for optional stats
        });
        // Show only members with capital ledger (share ledger) accounts
        newStats.members = data.membersWithCapitalLedger || 0;
      } catch (e) {
        // Members endpoint might not exist yet - ignore
      }

      // Fetch savings accounts if CBS enabled
      if (hasModule('cbs')) {
        try {
          const data = await apiClient.get<{ accounts?: any[] }>('/savings/accounts', {
            skipErrorToast: true,
          });
          newStats.savingsAccounts = data.accounts?.length || 0;
        } catch (e) {
          // Ignore errors
        }

        try {
          const data = await apiClient.get<{ applications?: any[] }>('/loans/applications', {
            skipErrorToast: true,
          });
          newStats.loans = data.applications?.length || 0;
        } catch (e) {
          // Ignore errors
        }
      }

      // Fetch employees if HRM enabled
      if (hasModule('hrm')) {
        try {
          const data = await apiClient.get<{ employees?: any[] }>('/hrm/employees', {
            skipErrorToast: true,
          });
          newStats.employees = data.employees?.length || 0;
        } catch (e) {
          // Ignore errors
        }
      }
    } catch (error) {
      // Error handling is done by API client
    } finally {
      setStats(newStats);
      setIsLoadingStats(false);
    }
  }, [token, hasModule]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-100">
          <p className="text-gray-700">
            Welcome back, <span className="font-semibold text-gray-900">{user?.firstName}</span>!
            Here's what's happening with your cooperative.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Cooperative Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-3">
                  <Building2 className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Cooperative</dt>
                    <dd className="text-lg font-semibold text-gray-900 truncate">
                      {cooperative?.name || 'N/A'}
                    </dd>
                    <dd className="text-xs text-gray-500 mt-1">{cooperative?.subdomain}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Members Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Members</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {isLoadingStats ? '...' : (stats.members ?? 'N/A')}
                    </dd>
                    <dd className="text-xs text-gray-500 mt-1">With capital ledger</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Accounts Card (if CBS enabled) */}
          {hasModule('cbs') && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                    <PiggyBank className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Savings Accounts
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {isLoadingStats ? '...' : (stats.savingsAccounts ?? 0)}
                      </dd>
                      <dd className="text-xs text-gray-500 mt-1">Active accounts</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loans Card (if CBS enabled) */}
          {hasModule('cbs') && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                    <Banknote className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Loans</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {isLoadingStats ? '...' : (stats.loans ?? 0)}
                      </dd>
                      <dd className="text-xs text-gray-500 mt-1">Total applications</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employees Card (if HRM enabled) */}
          {hasModule('hrm') && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                    <Briefcase className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Employees</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {isLoadingStats ? '...' : (stats.employees ?? 0)}
                      </dd>
                      <dd className="text-xs text-gray-500 mt-1">Active staff</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modules Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gray-100 rounded-lg p-3">
                  <Package className="w-6 h-6 text-gray-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Modules</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {cooperative?.enabledModules?.length || 0}
                    </dd>
                    <dd className="text-xs text-gray-500 mt-1">Enabled features</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enabled Modules Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Enabled Modules</h2>
            <Link
              href="/subscription"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Upgrade Plan →
            </Link>
          </div>
          {cooperative?.enabledModules && cooperative.enabledModules.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {cooperative.enabledModules.map((module) => {
                const moduleInfo: Record<string, { name: string; color: string }> = {
                  cbs: { name: 'Core Banking System', color: 'bg-green-100 text-green-800' },
                  dms: { name: 'Document Management', color: 'bg-blue-100 text-blue-800' },
                  hrm: { name: 'Human Resources', color: 'bg-purple-100 text-purple-800' },
                  governance: { name: 'Governance', color: 'bg-indigo-100 text-indigo-800' },
                  inventory: { name: 'Inventory', color: 'bg-yellow-100 text-yellow-800' },
                  compliance: { name: 'Compliance', color: 'bg-red-100 text-red-800' },
                };
                const info = moduleInfo[module] || {
                  name: module.toUpperCase(),
                  color: 'bg-gray-100 text-gray-800',
                };
                return (
                  <div
                    key={module}
                    className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${info.color}`}
                  >
                    <span className="mr-2">✓</span>
                    {info.name}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No modules enabled</p>
              <Link
                href="/subscription"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                View Plans & Upgrade
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Link
              href="/members"
              className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
              <Users className="w-10 h-10 mb-3 text-gray-600 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-gray-900 group-hover:text-indigo-600">Members</span>
            </Link>

            {hasModule('cbs') && (
              <>
                <Link
                  href="/savings"
                  className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                >
                  <PiggyBank className="w-10 h-10 mb-3 text-gray-600 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-gray-900 group-hover:text-indigo-600">
                    Savings
                  </span>
                </Link>
                <Link
                  href="/loans"
                  className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                >
                  <Banknote className="w-10 h-10 mb-3 text-gray-600 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-gray-900 group-hover:text-indigo-600">
                    Loans
                  </span>
                </Link>
                <Link
                  href="/shares"
                  className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                >
                  <TrendingUp className="w-10 h-10 mb-3 text-gray-600 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-gray-900 group-hover:text-indigo-600">
                    Shares
                  </span>
                </Link>
              </>
            )}

            {hasModule('hrm') && (
              <Link
                href="/employees"
                className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <Briefcase className="w-10 h-10 mb-3 text-gray-600 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-gray-900 group-hover:text-indigo-600">
                  Employees
                </span>
              </Link>
            )}

            <Link
              href="/subscription"
              className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
              <CreditCard className="w-10 h-10 mb-3 text-gray-600 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-gray-900 group-hover:text-indigo-600">
                Subscription
              </span>
            </Link>
          </div>
        </div>

        {/* Recent Activity (Placeholder) */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity to display</p>
            <p className="text-sm mt-2">Activity will appear here as you use the system</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
