'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  Download
} from 'lucide-react';
import NepaliDatePicker from '../../../components/NepaliDatePicker';
import { formatBsDate, adToBs, bsToAd } from '../../../lib/nepali-date';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface DayBookStatus {
  status: string;
  date?: string;
  openingCash?: number;
  closingCash?: number;
  dayBeginBy?: string;
  dayBeginByUser?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  dayBeginAt?: string;
  dayEndBy?: string;
  dayEndByUser?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  dayEndAt?: string;
  transactionsCount?: number;
}

export default function DayBookPage() {
  const { token, hasModule } = useAuth();
  const [dayStatus, setDayStatus] = useState<DayBookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDayBeginModal, setShowDayBeginModal] = useState(false);
  const [showDayEndModal, setShowDayEndModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dayHistory, setDayHistory] = useState<any[]>([]);

  useEffect(() => {
    if (token && hasModule('cbs')) {
      fetchDayStatus();
      fetchDayHistory();
    }
  }, [token, hasModule]);

  const fetchDayStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/cbs/day-book/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status !== 'NO_DAY_OPEN') {
          setDayStatus(data);
        } else {
          setDayStatus(null);
        }
      } else {
        setDayStatus(null);
      }
    } catch (error) {
      console.error('Error fetching day status:', error);
      setDayStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDayHistory = async () => {
    try {
      // This would need a new API endpoint for day history
      // For now, we'll just show current status
    } catch (error) {
      console.error('Error fetching day history:', error);
    }
  };

  const handleDayBegin = async (bsDate?: string) => {
    let dateToUse = selectedDate;
    
    // If BS date is provided, convert it to AD
    if (bsDate) {
      try {
        const adDate = bsToAd(bsDate);
        dateToUse = adDate.toISOString().split('T')[0];
      } catch (error) {
        toast.error('Invalid BS date format');
        return;
      }
    }

    if (!dateToUse) {
      toast.error('Please select a date');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/cbs/day-book/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: dateToUse,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Day started successfully!');
        setShowDayBeginModal(false);
        setSelectedDate('');
        fetchDayStatus();
      } else {
        toast.error(data.error || 'Failed to start day');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start day');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickSetDate = async (bsDate: string) => {
    if (!confirm(`Set system date to ${bsDate} (BS)? This will start a new day.`)) {
      return;
    }
    await handleDayBegin(bsDate);
  };

  const handleDayEnd = async () => {
    if (!confirm('Are you sure you want to close the day? This action cannot be undone easily.')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/cbs/day-book/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Day closed successfully!');
        setShowDayEndModal(false);
        fetchDayStatus();
      } else {
        toast.error(data.error || 'Failed to close day');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to close day');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadEODReport = async (format: 'pdf' | 'csv' = 'pdf') => {
    if (!dayStatus?.date) return;

    try {
      const response = await fetch(
        `${API_URL}/cbs/day-book/reports/eod?format=${format}&day=${dayStatus.date}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eod-report-${dayStatus.date}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Report downloaded successfully');
      } else {
        toast.error('Failed to download report');
      }
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  if (!hasModule('cbs')) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">CBS module is not enabled for your cooperative.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading day status...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const systemDate = dayStatus?.date ? new Date(dayStatus.date) : new Date();
  const systemDateStr = systemDate.toISOString().split('T')[0];
  const systemDateBS = formatBsDate(adToBs(systemDate));

  return (
    <ProtectedRoute>
      <div>
        <div className="mb-6">
          <p className="text-gray-600">Manage system date and day operations</p>
        </div>

        {/* Current Day Status Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Main Status Card */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Current Day Status</h2>
              <button
                onClick={fetchDayStatus}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>

            {dayStatus ? (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  {dayStatus.status === 'OPEN' && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Day Open</span>
                    </div>
                  )}
                  {dayStatus.status === 'CLOSED' && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Day Closed</span>
                    </div>
                  )}
                  {dayStatus.status === 'EOD_IN_PROGRESS' && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Day End In Progress</span>
                    </div>
                  )}
                </div>

                {/* System Date */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-500">System Date</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {systemDate.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">{systemDateBS}</p>
                  </div>
                </div>

                {/* Day Begin Info */}
                {dayStatus.dayBeginByUser && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Play className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Day Begin</p>
                      <p className="text-sm font-medium text-gray-900">
                        {dayStatus.dayBeginByUser.firstName} {dayStatus.dayBeginByUser.lastName}
                      </p>
                      {dayStatus.dayBeginAt && (
                        <p className="text-xs text-gray-500">
                          {new Date(dayStatus.dayBeginAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Day End Info */}
                {dayStatus.status === 'CLOSED' && dayStatus.dayEndByUser && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Square className="h-5 w-5 text-purple-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Day End</p>
                      <p className="text-sm font-medium text-gray-900">
                        {dayStatus.dayEndByUser.firstName} {dayStatus.dayEndByUser.lastName}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cash Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-gray-500">Opening Cash</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      Rs. {dayStatus.openingCash?.toLocaleString('en-NP') || '0.00'}
                    </p>
                  </div>
                  {dayStatus.status === 'CLOSED' && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <p className="text-sm text-gray-500">Closing Cash</p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        Rs. {dayStatus.closingCash?.toLocaleString('en-NP') || '0.00'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Transactions Count */}
                {dayStatus.transactionsCount !== undefined && (
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-500">Transactions</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {dayStatus.transactionsCount}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {dayStatus.status === 'OPEN' && (
                    <button
                      onClick={() => setShowDayEndModal(true)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Square className="h-4 w-4" />
                      Close Day (Day End)
                    </button>
                  )}
                  {dayStatus.status === 'CLOSED' && (
                    <button
                      onClick={() => setShowDayBeginModal(true)}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Start New Day (Day Begin)
                    </button>
                  )}
                  {dayStatus.status === 'CLOSED' && (
                    <button
                      onClick={() => downloadEODReport('pdf')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      EOD Report
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No day is currently open</p>
                <button
                  onClick={() => {
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                    setShowDayBeginModal(true);
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Play className="h-4 w-4" />
                  Start Day (Day Begin)
                </button>
              </div>
            )}
          </div>

          {/* Quick Info Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current System Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {systemDate.toLocaleDateString('en-GB')}
                </p>
                <p className="text-sm text-gray-600">{systemDateBS}</p>
              </div>
              
              {/* Quick Date Set */}
              {!dayStatus && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Quick Set Date:</p>
                  <button
                    onClick={() => handleQuickSetDate('2082-04-01')}
                    disabled={actionLoading}
                    className="w-full px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    Set to 2082-04-01 (BS)
                  </button>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Instructions:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Day Begin starts a new working day</li>
                  <li>• All transactions use system date</li>
                  <li>• Day End closes the current day</li>
                  <li>• Previous day must be closed before starting new day</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Day Begin Modal */}
        {showDayBeginModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Start New Day (Day Begin)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                  </label>
                  <NepaliDatePicker
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    label=""
                    required
                  />
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Make sure the previous day is closed before starting a new day.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDayBeginModal(false);
                      setSelectedDate('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDayBegin}
                    disabled={actionLoading || !selectedDate}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Starting...' : 'Start Day'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Day End Modal */}
        {showDayEndModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Close Day (Day End)</h3>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> Closing the day will finalize all transactions for today.
                    Make sure all tellers have settled before closing.
                  </p>
                </div>
                {dayStatus && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">System Date:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {systemDate.toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transactions:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {dayStatus.transactionsCount || 0}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDayEndModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDayEnd}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Closing...' : 'Close Day'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

