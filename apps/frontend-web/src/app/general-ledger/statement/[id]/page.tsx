'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { useAuth } from '../../../../contexts/AuthContext';
import { ArrowLeft, FileText, Calendar, DollarSign, Download } from 'lucide-react';
// @ts-ignore - nepali-date-converter doesn't have TypeScript types
import NepaliDate from 'nepali-date-converter';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface LedgerEntry {
  id: string;
  date: string;
  entryNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface StatementData {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  openingBalance: number;
  entries: LedgerEntry[];
}

export default function LedgerStatementPage() {
  const { token, hasModule } = useAuth();
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [statement, setStatement] = useState<StatementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!hasModule('cbs')) {
      setError('CBS module is not enabled for your subscription');
      setIsLoading(false);
      return;
    }
    fetchStatement();
  }, [token, hasModule, accountId, startDate, endDate]);

  const fetchStatement = async () => {
    if (!token || !accountId) return;

    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await fetch(
        `${API_URL}/accounting/accounts/${accountId}/statement?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStatement(data);
      } else {
        const data = await response.json();
        setError(data.error || 'Error loading statement');
      }
    } catch (err) {
      setError('Error loading statement');
      console.error('Statement error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const closingBalance = statement
    ? statement.entries.length > 0
      ? statement.entries[statement.entries.length - 1].balance
      : statement.openingBalance
    : 0;

  const totalDebit = statement?.entries.reduce((sum, entry) => sum + entry.debit, 0) || 0;
  const totalCredit = statement?.entries.reduce((sum, entry) => sum + entry.credit, 0) || 0;

  // Helper function to convert AD date to Nepali date
  const formatNepaliDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      // @ts-ignore
      const nepaliDate = new NepaliDate(date);
      const year = nepaliDate.getYear();
      const month = nepaliDate.getMonth() + 1; // 0-indexed to 1-indexed
      const day = nepaliDate.getDate();

      const nepaliMonths = [
        'बैशाख',
        'जेष्ठ',
        'आषाढ',
        'श्रावण',
        'भाद्र',
        'आश्विन',
        'कार्तिक',
        'मंसिर',
        'पौष',
        'माघ',
        'फाल्गुन',
        'चैत्र',
      ];

      return `${year} ${nepaliMonths[month - 1]} ${day}`;
    } catch (error) {
      console.error('Error converting to Nepali date:', error);
      return '';
    }
  };

  // Helper function to format English date
  const formatEnglishDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="p-3 bg-indigo-100 rounded-xl">
              <FileText className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ledger Statement</h1>
              {statement && (
                <>
                  <p className="text-gray-600 mt-1">
                    {statement.account.code} - {statement.account.name}
                  </p>
                  {statement.account.code === '00-30100-01-00000' && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> This statement shows all historical transactions, including those from deleted members. 
                        The Shares Dashboard shows only current active share accounts. The difference between these two values 
                        represents historical transactions that may no longer have active member accounts.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">From Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">To Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={fetchStatement}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Apply Filter
            </button>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading statement...</p>
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
                <h3 className="text-lg font-semibold text-red-900">Error Loading Statement</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchStatement}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : statement ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Opening Balance</p>
                <p className="text-lg font-bold text-gray-900">
                  रु.{' '}
                  {statement.openingBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Total Debit</p>
                <p className="text-lg font-bold text-red-600">
                  रु.{' '}
                  {totalDebit.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Total Credit</p>
                <p className="text-lg font-bold text-green-600">
                  रु.{' '}
                  {totalCredit.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Closing Balance</p>
                <p className="text-lg font-bold text-indigo-600">
                  रु.{' '}
                  {closingBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            {/* Statement Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      BS Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      AD Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Entry No.
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Debit (रु.)
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Credit (रु.)
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Balance (रु.)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {/* Opening Balance Row */}
                  <tr className="bg-blue-50">
                    <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-gray-900">
                      Opening Balance
                    </td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                      रु.{' '}
                      {statement.openingBalance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>

                  {statement.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No transactions found for the selected period
                      </td>
                    </tr>
                  ) : (
                    statement.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900 font-medium">
                          {formatNepaliDate(entry.date)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                          {formatEnglishDate(entry.date)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600 font-mono">
                          {entry.entryNumber.startsWith('JE-') ? (
                            <button
                              onClick={() => router.push(`/general-ledger/journal/${entry.entryNumber}`)}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline"
                              title="View Journal Entry Details"
                            >
                              {entry.entryNumber}
                            </button>
                          ) : (
                            entry.entryNumber
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-800">{entry.description}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-semibold text-red-600">
                          {entry.debit > 0
                            ? `रु. ${entry.debit.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : '—'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-semibold text-green-600">
                          {entry.credit > 0
                            ? `रु. ${entry.credit.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : '—'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-bold text-gray-900">
                          रु.{' '}
                          {entry.balance.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Closing Balance Row */}
                  {statement.entries.length > 0 && (
                    <tr className="bg-indigo-50 font-semibold">
                      <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-gray-900">
                        Closing Balance
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-semibold text-red-600">
                        रु.{' '}
                        {totalDebit.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-semibold text-green-600">
                        रु.{' '}
                        {totalCredit.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-indigo-600">
                        रु.{' '}
                        {closingBalance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
