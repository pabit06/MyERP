'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  Download,
  Calendar,
  Filter,
  PieChart,
  BarChart,
  TrendingUp,
  X,
} from 'lucide-react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import NepaliDatePicker from '../../../components/NepaliDatePicker';

type ReportType = 'balance-sheet' | 'profit-loss' | 'trial-balance';

export default function FinancialStatementsPage() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<ReportType | null>(null);
  const [reportFilters, setReportFilters] = useState({
    asOfDate: '',
    startDate: '',
    endDate: '',
    nfrs: false,
  });

  const handleGenerateReport = () => {
    // Logic to fetch and display the report will go here
    console.log(`Generating ${activeModal} with filters:`, reportFilters);
    setActiveModal(null); // Close modal after generating
  };

  const openModal = (reportType: ReportType) => {
    // Reset filters when opening a new modal
    setReportFilters({
      asOfDate: '',
      startDate: '',
      endDate: '',
      nfrs: false,
    });
    setActiveModal(reportType);
  };

  const getModalTitle = () => {
    switch (activeModal) {
      case 'balance-sheet':
        return 'Generate Balance Sheet';
      case 'profit-loss':
        return 'Generate Profit & Loss Statement';
      case 'trial-balance':
        return 'Generate Trial Balance';
      default:
        return '';
    }
  };

  const getModalIcon = () => {
    switch (activeModal) {
      case 'balance-sheet':
        return <PieChart className="w-5 h-5 text-blue-600" />;
      case 'profit-loss':
        return <BarChart className="w-5 h-5 text-green-600" />;
      case 'trial-balance':
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-cyan-600" />
                  Financial Statements
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Generate Balance Sheet, Profit & Loss, and Trial Balance reports
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <PieChart className="w-5 h-5 text-blue-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Balance Sheet</h3>
              <p className="text-sm text-gray-600 mb-4 flex-grow">
                A snapshot of the cooperative's financial health.
              </p>
              <button
                onClick={() => openModal('balance-sheet')}
                className="w-full mt-auto bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                Generate Report
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart className="w-5 h-5 text-green-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Profit & Loss</h3>
              <p className="text-sm text-gray-600 mb-4 flex-grow">
                Summarizes revenues, costs, and expenses.
              </p>
              <button
                onClick={() => openModal('profit-loss')}
                className="w-full mt-auto bg-green-50 text-green-600 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
              >
                Generate Report
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Trial Balance</h3>
              <p className="text-sm text-gray-600 mb-4 flex-grow">
                Lists all general ledger accounts and their balances.
              </p>
              <button
                onClick={() => openModal('trial-balance')}
                className="w-full mt-auto bg-yellow-50 text-yellow-600 px-4 py-2 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium"
              >
                Generate Report
              </button>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-center text-gray-500 py-8">
              Click "Generate Report" on a card to set filters and view the report.
            </p>
          </div>

          {/* Report Generation Modal */}
          {activeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    {getModalIcon()}
                    {getModalTitle()}
                  </h2>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  {activeModal === 'profit-loss' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <NepaliDatePicker
                          value={reportFilters.startDate}
                          onChange={(dateString) =>
                            setReportFilters({ ...reportFilters, startDate: dateString })
                          }
                          label="Start Date"
                        />
                      </div>
                      <div>
                        <NepaliDatePicker
                          value={reportFilters.endDate}
                          onChange={(dateString) =>
                            setReportFilters({ ...reportFilters, endDate: dateString })
                          }
                          label="End Date"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <NepaliDatePicker
                        value={reportFilters.asOfDate}
                        onChange={(dateString) =>
                          setReportFilters({ ...reportFilters, asOfDate: dateString })
                        }
                        label="As of Date"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="nfrs-checkbox"
                      checked={reportFilters.nfrs}
                      onChange={(e) =>
                        setReportFilters({ ...reportFilters, nfrs: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor="nfrs-checkbox" className="text-sm font-medium text-gray-700">
                      Use NFRS Format
                    </label>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateReport}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
