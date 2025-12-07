'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, ArrowLeft, FileText, Download, Calendar, Filter } from 'lucide-react';
import { ProtectedRoute, NepaliDatePicker } from '@/features/components/shared';

export default function LoanReportsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [dateFilters, setDateFilters] = useState({
    fromDate: '',
    toDate: '',
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Banknote className="w-6 h-6 text-purple-600" />
                    Loan Reports
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Loan portfolio analysis, disbursements, collections, and NPA tracking
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <NepaliDatePicker
                  value={dateFilters.fromDate}
                  onChange={(dateString) =>
                    setDateFilters({ ...dateFilters, fromDate: dateString })
                  }
                  label="From Date"
                />
              </div>
              <div>
                <NepaliDatePicker
                  value={dateFilters.toDate}
                  onChange={(dateString) => setDateFilters({ ...dateFilters, toDate: dateString })}
                  label="To Date"
                />
              </div>
              <div className="flex items-end">
                <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Loan Portfolio Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loan Portfolio Report</h3>
              <p className="text-sm text-gray-600 mb-4">
                Comprehensive view of all loans and their status
              </p>
              <button className="w-full bg-purple-50 text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium">
                Generate Report
              </button>
            </div>

            {/* Collection Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Collection Report</h3>
              <p className="text-sm text-gray-600 mb-4">Track loan collections and recoveries</p>
              <button className="w-full bg-green-50 text-green-600 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium">
                Generate Report
              </button>
            </div>

            {/* NPA Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">NPA Report</h3>
              <p className="text-sm text-gray-600 mb-4">Non-performing assets and overdue loans</p>
              <button className="w-full bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
                Generate Report
              </button>
            </div>
          </div>

          {/* Placeholder for Report Results */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-center text-gray-500 py-8">
              Select a report above to generate and view results
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
