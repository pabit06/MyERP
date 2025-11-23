'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  ArrowDown,
  Plus,
  DollarSign,
  FileText,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface GLStats {
  assets: {
    total: number;
    count: number;
    groupCount: number;
    ledgerCount: number;
  };
  liabilities: {
    total: number;
    count: number;
    groupCount: number;
    ledgerCount: number;
  };
  equity: {
    total: number;
    count: number;
    groupCount: number;
    ledgerCount: number;
  };
  income: {
    total: number;
    count: number;
    groupCount: number;
    ledgerCount: number;
  };
  expenses: {
    total: number;
    count: number;
    groupCount: number;
    ledgerCount: number;
  };
}

export default function GeneralLedgerPage() {
  const { hasModule, token } = useAuth();
  const [stats, setStats] = useState<GLStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasModule('cbs')) {
      setError('CBS module is not enabled for your subscription');
      setIsLoading(false);
      return;
    }
    fetchDashboardStats();
  }, [token, hasModule]);

  const fetchDashboardStats = async () => {
    if (!token) return;

    setIsLoading(true);
    setError('');
    try {
      // Fetch all account types in parallel
      const [assetsRes, liabilitiesRes, equityRes, incomeRes, expensesRes] = await Promise.all([
        fetch(`${API_URL}/accounting/accounts?type=asset`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/accounting/accounts?type=liability`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/accounting/accounts?type=equity`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/accounting/accounts?type=income`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/accounting/accounts?type=expense`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [assetsData, liabilitiesData, equityData, incomeData, expensesData] = await Promise.all(
        [
          assetsRes.ok ? assetsRes.json() : [],
          liabilitiesRes.ok ? liabilitiesRes.json() : [],
          equityRes.ok ? equityRes.json() : [],
          incomeRes.ok ? incomeRes.json() : [],
          expensesRes.ok ? expensesRes.json() : [],
        ]
      );

      // Calculate statistics
      const calculateStats = (accounts: any[]) => {
        const total = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
        const groupCount = accounts.filter((acc) => acc.isGroup).length;
        const ledgerCount = accounts.filter((acc) => !acc.isGroup).length;
        return {
          total,
          count: accounts.length,
          groupCount,
          ledgerCount,
        };
      };

      setStats({
        assets: calculateStats(assetsData),
        liabilities: calculateStats(liabilitiesData),
        equity: calculateStats(equityData),
        income: calculateStats(incomeData),
        expenses: calculateStats(expensesData),
      });
    } catch (err) {
      setError('Error loading dashboard statistics');
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasModule('cbs')) {
    return (
      <ProtectedRoute requiredModule="cbs">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">CBS module is not enabled for your subscription</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const totalAssets = stats?.assets.total || 0;
  const totalLiabilities = stats?.liabilities.total || 0;
  const totalEquity = stats?.equity.total || 0;
  const netWorth = totalAssets - (totalLiabilities + totalEquity);
  const totalIncome = stats?.income.total || 0;
  const totalExpenses = stats?.expenses.total || 0;
  const netIncome = totalIncome - totalExpenses;

  return (
    <ProtectedRoute requiredModule="cbs">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <BookOpen className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">General Ledger</h1>
              <p className="text-gray-600 mt-1">
                Chart of Accounts Dashboard (लेखा खाता ड्यासबोर्ड)
              </p>
            </div>
          </div>
          <button
            onClick={fetchDashboardStats}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-xl">!</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error Loading Dashboard</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchDashboardStats}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Balance Sheet Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-6 w-6 text-green-700" />
                    <h2 className="text-xl font-bold text-green-900">Balance Sheet Summary</h2>
                  </div>
                  <span className="text-xs font-semibold text-green-700 bg-green-200 px-3 py-1 rounded-full">
                    Assets = Liabilities + Equity
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/80 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Assets</p>
                    <p className="text-2xl font-bold text-green-700">
                      रु.{' '}
                      {totalAssets.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Liabilities</p>
                    <p className="text-2xl font-bold text-red-700">
                      रु.{' '}
                      {totalLiabilities.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Equity</p>
                    <p className="text-2xl font-bold text-blue-700">
                      रु.{' '}
                      {totalEquity.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Net Worth</p>
                    <p
                      className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-700' : 'text-red-700'}`}
                    >
                      रु.{' '}
                      {Math.abs(netWorth).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Income Statement Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <PieChart className="h-6 w-6 text-blue-700" />
                  <h2 className="text-xl font-bold text-blue-900">Income Statement</h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-white/80 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Income</p>
                    <p className="text-2xl font-bold text-blue-700">
                      रु.{' '}
                      {totalIncome.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Expenses</p>
                    <p className="text-2xl font-bold text-orange-700">
                      रु.{' '}
                      {totalExpenses.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-4 border-2 border-blue-300">
                    <p className="text-sm font-medium text-gray-600 mb-2">Net Income</p>
                    <p
                      className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}
                    >
                      रु.{' '}
                      {Math.abs(netIncome).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Type Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Assets Card */}
              <Link
                href="/general-ledger/assets"
                className="block bg-white border-2 border-green-200 rounded-xl p-5 hover:shadow-xl hover:border-green-400 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                    {stats?.assets.count || 0} Accounts
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Assets</h3>
                <p className="text-sm text-gray-600 mb-3">सम्पत्ति</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">
                    रु.{' '}
                    {(stats?.assets.total || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats?.assets.groupCount || 0} Groups • {stats?.assets.ledgerCount || 0}{' '}
                    Ledgers
                  </p>
                </div>
              </Link>

              {/* Liabilities Card */}
              <Link
                href="/general-ledger/liabilities"
                className="block bg-white border-2 border-red-200 rounded-xl p-5 hover:shadow-xl hover:border-red-400 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                  <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded">
                    {stats?.liabilities.count || 0} Accounts
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Liabilities</h3>
                <p className="text-sm text-gray-600 mb-3">दायित्व</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-red-600">
                    रु.{' '}
                    {(stats?.liabilities.total || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats?.liabilities.groupCount || 0} Groups •{' '}
                    {stats?.liabilities.ledgerCount || 0} Ledgers
                  </p>
                </div>
              </Link>

              {/* Equity Card */}
              <Link
                href="/general-ledger/equity"
                className="block bg-white border-2 border-blue-200 rounded-xl p-5 hover:shadow-xl hover:border-blue-400 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                    {stats?.equity.count || 0} Accounts
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Equity</h3>
                <p className="text-sm text-gray-600 mb-3">इक्विटी</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-blue-600">
                    रु.{' '}
                    {(stats?.equity.total || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats?.equity.groupCount || 0} Groups • {stats?.equity.ledgerCount || 0}{' '}
                    Ledgers
                  </p>
                </div>
              </Link>

              {/* Income Card */}
              <Link
                href="/general-ledger/income"
                className="block bg-white border-2 border-blue-200 rounded-xl p-5 hover:shadow-xl hover:border-blue-400 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Plus className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                    {stats?.income.count || 0} Accounts
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Income</h3>
                <p className="text-sm text-gray-600 mb-3">आम्दानी</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-blue-600">
                    रु.{' '}
                    {(stats?.income.total || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats?.income.groupCount || 0} Groups • {stats?.income.ledgerCount || 0}{' '}
                    Ledgers
                  </p>
                </div>
              </Link>

              {/* Expenses Card */}
              <Link
                href="/general-ledger/expenses"
                className="block bg-white border-2 border-orange-200 rounded-xl p-5 hover:shadow-xl hover:border-orange-400 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <ArrowDown className="h-6 w-6 text-orange-600" />
                  </div>
                  <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded">
                    {stats?.expenses.count || 0} Accounts
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Expenses</h3>
                <p className="text-sm text-gray-600 mb-3">खर्च</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-orange-600">
                    रु.{' '}
                    {(stats?.expenses.total || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats?.expenses.groupCount || 0} Groups • {stats?.expenses.ledgerCount || 0}{' '}
                    Ledgers
                  </p>
                </div>
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <span>Quick Actions</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Link
                  href="/general-ledger/assets"
                  className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all group"
                >
                  <TrendingUp className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-gray-700 group-hover:text-green-700">
                    View Assets
                  </span>
                </Link>
                <Link
                  href="/general-ledger/liabilities"
                  className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all group"
                >
                  <TrendingDown className="h-5 w-5 text-red-600 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-gray-700 group-hover:text-red-700">
                    View Liabilities
                  </span>
                </Link>
                <Link
                  href="/general-ledger/income"
                  className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <Plus className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-gray-700 group-hover:text-blue-700">
                    View Income
                  </span>
                </Link>
                <Link
                  href="/general-ledger/expenses"
                  className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all group"
                >
                  <ArrowDown className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-gray-700 group-hover:text-orange-700">
                    View Expenses
                  </span>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
