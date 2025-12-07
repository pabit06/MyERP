'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute, NepaliDateDisplay } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import { LayoutDashboard, Plus, ArrowLeftRight, FileText, Award, BookOpen } from 'lucide-react';

interface DashboardStats {
  totalShareCapital: number;
  totalKitta: number;
  totalMembers: number;
  recentTransactions: any[];
}

export default function SharesPage() {
  const { hasModule } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'issue' | 'return' | 'statement' | 'certificates' | 'register'
  >('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasModule('cbs')) {
      setError('CBS module is not enabled for your subscription');
      setIsLoading(false);
      return;
    }
    if (activeTab === 'dashboard') {
      fetchDashboard();
    }
  }, [hasModule, activeTab]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<DashboardStats>('/shares/dashboard');
      setStats(data);
    } catch (err) {
      setError('Error loading dashboard data');
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

  return (
    <ProtectedRoute requiredModule="cbs">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shares Management</h1>
          <p className="text-gray-600">Manage member share accounts and transactions</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <LayoutDashboard className="inline-block w-4 h-4 mr-2" />
              Dashboard
            </button>
            <Link
              href="/shares/issue"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'issue'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Plus className="inline-block w-4 h-4 mr-2" />
              Issue Share
            </Link>
            <Link
              href="/shares/return"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'return'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ArrowLeftRight className="inline-block w-4 h-4 mr-2" />
              Return Share
            </Link>
            <Link
              href="/shares/statement"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'statement'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="inline-block w-4 h-4 mr-2" />
              Statement
            </Link>
            <Link
              href="/shares/certificates"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'certificates'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Award className="inline-block w-4 h-4 mr-2" />
              Certificates
            </Link>
            <Link
              href="/shares/register"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'register'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BookOpen className="inline-block w-4 h-4 mr-2" />
              Share Register
            </Link>
          </nav>
        </div>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <div>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-600">Loading dashboard...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            ) : stats ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Share Capital</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                          रु.{' '}
                          {stats.totalShareCapital.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">कुल शेयर पूँजी</p>
                      </div>
                      <div className="bg-indigo-100 rounded-full p-3">
                        <Award className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Kitta</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                          {stats.totalKitta.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">कुल कित्ता</p>
                      </div>
                      <div className="bg-green-100 rounded-full p-3">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Members</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                          {stats.totalMembers}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">सदस्यहरू</p>
                      </div>
                      <div className="bg-blue-100 rounded-full p-3">
                        <LayoutDashboard className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-lg shadow border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Member
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kitta
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.recentTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                              No transactions found
                            </td>
                          </tr>
                        ) : (
                          stats.recentTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <NepaliDateDisplay date={tx.date} showBs={true} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {tx.member?.memberNumber} - {tx.member?.firstName}{' '}
                                {tx.member?.lastName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    tx.type === 'PURCHASE'
                                      ? 'bg-green-100 text-green-800'
                                      : tx.type === 'RETURN'
                                        ? 'bg-red-100 text-red-800'
                                        : tx.type === 'BONUS'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {tx.kitta > 0 ? '+' : ''}
                                {tx.kitta}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                रु.{' '}
                                {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
