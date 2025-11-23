'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { useAuth } from '../../../../contexts/AuthContext';
import { ArrowLeft, FileText, Calendar, DollarSign, ExternalLink } from 'lucide-react';
// @ts-ignore - nepali-date-converter doesn't have TypeScript types
import NepaliDate from 'nepali-date-converter';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface JournalEntryDetail {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  debit: number;
  credit: number;
  balance: number;
}

interface JournalEntryData {
  journalEntry: {
    id: string;
    entryNumber: string;
    description: string;
    date: string;
    createdAt: string;
  };
  entries: JournalEntryDetail[];
  totals: {
    debit: number;
    credit: number;
  };
}

export default function JournalEntryDetailPage() {
  const { token, hasModule } = useAuth();
  const params = useParams();
  const router = useRouter();
  const entryNumber = params.entryNumber as string;

  const [journalEntry, setJournalEntry] = useState<JournalEntryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasModule('cbs')) {
      setError('CBS module is not enabled for your subscription');
      setIsLoading(false);
      return;
    }
    fetchJournalEntry();
  }, [token, hasModule, entryNumber]);

  const fetchJournalEntry = async () => {
    if (!token || !entryNumber) return;

    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/accounting/journal-entries/${entryNumber}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJournalEntry(data);
      } else {
        const data = await response.json();
        setError(data.error || 'Error loading journal entry');
      }
    } catch (err) {
      setError('Error loading journal entry');
      console.error('Journal entry error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to convert AD date to Nepali date
  const formatNepaliDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      // @ts-ignore
      const nepaliDate = new NepaliDate(date);
      const year = nepaliDate.getYear();
      const month = nepaliDate.getMonth() + 1;
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

  const getAccountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'asset':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'liability':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'equity':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'income':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'expense':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
              <h1 className="text-3xl font-bold text-gray-900">Journal Entry</h1>
              {journalEntry && (
                <p className="text-gray-600 mt-1 font-mono">{journalEntry.journalEntry.entryNumber}</p>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading journal entry...</p>
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
                <h3 className="text-lg font-semibold text-red-900">Error Loading Journal Entry</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchJournalEntry}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : journalEntry ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
            {/* Journal Entry Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-indigo-700 mb-1">Entry Number</p>
                  <p className="text-xl font-bold text-indigo-900 font-mono">
                    {journalEntry.journalEntry.entryNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-700 mb-1">Date</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <p className="text-lg font-semibold text-indigo-900">
                      {formatNepaliDate(journalEntry.journalEntry.date)} ({formatEnglishDate(journalEntry.journalEntry.date)})
                    </p>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-indigo-700 mb-1">Description</p>
                  <p className="text-lg text-indigo-900">{journalEntry.journalEntry.description}</p>
                </div>
              </div>
            </div>

            {/* Journal Entry Details Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Account Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Account Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Debit (रु.)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Credit (रु.)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {journalEntry.entries.map((entry) => (
                    <tr key={entry.account.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/general-ledger/statement/${entry.account.id}`)}
                          className="text-xs font-mono text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {entry.account.code}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900">{entry.account.name}</span>
                          <button
                            onClick={() => router.push(`/general-ledger/statement/${entry.account.id}`)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="View Account Statement"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getAccountTypeColor(entry.account.type)}`}
                        >
                          {entry.account.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-red-600">
                        {entry.debit > 0
                          ? `रु. ${entry.debit.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                        {entry.credit > 0
                          ? `रु. ${entry.credit.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-indigo-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-red-600">
                      रु.{' '}
                      {journalEntry.totals.debit.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                      रु.{' '}
                      {journalEntry.totals.credit.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Double Entry Validation */}
            {Math.abs(journalEntry.totals.debit - journalEntry.totals.credit) > 0.01 && (
              <div className="bg-red-50 border-t-2 border-red-200 p-4">
                <p className="text-sm text-red-800">
                  ⚠️ Warning: Debits ({journalEntry.totals.debit.toLocaleString()}) do not equal Credits ({journalEntry.totals.credit.toLocaleString()})
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}

