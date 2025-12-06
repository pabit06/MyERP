'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute, RichTextEditor, ConfirmModal } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import './ReportPrint.module.css';

interface ManagerReport {
  id: string;
  title: string;
  fiscalYear: string;
  month: string;
  status: 'DRAFT' | 'FINALIZED';
  finalizedAt: string | null;
  finalizedBy: string | null;
  financialData: any;
  previousMonthData: any;
  memberData: any;
  loanData: any;
  liquidityData: any;
  governanceData: any;
  description: string | null;
  challenges: string | null;
  plans: string | null;
  suggestions: string | null;
  meeting?: {
    id: string;
    title: string;
    meetingNo: number | null;
  } | null;
}

type TabType = 'financial' | 'members' | 'loans' | 'liquidity' | 'governance';

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, hasModule, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('financial');
  const [report, setReport] = useState<ManagerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showFetchConfirm, setShowFetchConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // Form state for narrative sections
  const [description, setDescription] = useState('');
  const [challenges, setChallenges] = useState('');
  const [plans, setPlans] = useState('');
  const [suggestions, setSuggestions] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated && token && params.id) {
      fetchReportDetails();
    }
  }, [authLoading, isAuthenticated, token, params.id]);

  useEffect(() => {
    if (report) {
      setDescription(report.description || '');
      setChallenges(report.challenges || '');
      setPlans(report.plans || '');
      setSuggestions(report.suggestions || '');
    }
  }, [report]);

  const fetchReportDetails = async () => {
    if (!token || !params.id) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/governance/reports/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setReport(data.report);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching report details:', error);
      setError(error.message || 'Failed to fetch report details');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchData = async () => {
    if (!token || !params.id) return;
    setFetchingData(true);
    try {
      const response = await fetch(`${API_URL}/governance/reports/${params.id}/fetch-data`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      await fetchReportDetails();
      alert('Data fetched successfully!');
    } catch (error: any) {
      alert(error.message || 'Error fetching data');
    } finally {
      setFetchingData(false);
      setShowFetchConfirm(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!token || !params.id || !report) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/governance/reports/${params.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          challenges,
          plans,
          suggestions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save report');
      }

      await fetchReportDetails();
      alert('Report saved successfully!');
    } catch (error: any) {
      alert(error.message || 'Error saving report');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!token || !params.id) return;
    setFinalizing(true);
    try {
      const response = await fetch(`${API_URL}/governance/reports/${params.id}/finalize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize report');
      }

      await fetchReportDetails();
      alert('Report finalized successfully!');
    } catch (error: any) {
      alert(error.message || 'Error finalizing report');
    } finally {
      setFinalizing(false);
      setShowFinalizeConfirm(false);
    }
  };

  const isDraft = report?.status === 'DRAFT';
  const isFinalized = report?.status === 'FINALIZED';

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please login to access this page.</p>
        </div>
      </div>
    );
  }

  if (!hasModule('governance')) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">
              Governance module is not enabled for your subscription plan.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!report) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="space-y-6">
          <Link
            href="/governance/reports"
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            ← Back to Reports
          </Link>
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error || 'Report not found'}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="space-y-6 report-print-container">
        {/* Header */}
        <div>
          <Link
            href="/governance/reports"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
          >
            ← Back to Reports
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{report.title}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {report.fiscalYear} / {report.month} • {report.status}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isFinalized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {report.status}
              </span>
              {isDraft && (
                <>
                  <button
                    onClick={() => setShowFetchConfirm(true)}
                    disabled={fetchingData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {fetchingData ? 'Fetching...' : 'Auto-Fetch Data'}
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={() => setShowFinalizeConfirm(true)}
                    disabled={finalizing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                  >
                    {finalizing ? 'Finalizing...' : 'Finalize Report'}
                  </button>
                </>
              )}
              {isFinalized && (
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  Print/Export PDF
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'financial', label: 'Financial Report', nepali: 'वित्तीय प्रतिवेदन' },
                { id: 'members', label: 'Member Administration', nepali: 'सदस्य व्यवस्थापन' },
                { id: 'loans', label: 'Loans & Recovery', nepali: 'कर्जा तथा असुली' },
                { id: 'liquidity', label: 'Liquidity & Liabilities', nepali: 'तरलता तथा दायित्व' },
                { id: 'governance', label: 'Governance & Operations', nepali: 'सुशासन तथा विविध' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className="block text-xs mt-1">{tab.nepali}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Tab 1: Financial Report */}
            {activeTab === 'financial' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Financial Report (वित्तीय प्रतिवेदन)
                </h2>
                {report.financialData ? (
                  <div className="space-y-4">
                    {/* Balance Sheet */}
                    {report.financialData.balanceSheet && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Balance Sheet</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Assets</h4>
                            <div className="text-sm text-gray-600">
                              Total:{' '}
                              {report.financialData.balanceSheet.totalAssets?.toLocaleString() || 0}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Liabilities & Equity</h4>
                            <div className="text-sm text-gray-600">
                              Liabilities:{' '}
                              {report.financialData.balanceSheet.totalLiabilities?.toLocaleString() ||
                                0}
                              <br />
                              Equity:{' '}
                              {report.financialData.balanceSheet.totalEquity?.toLocaleString() || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Income Statement */}
                    {report.financialData.incomeStatement && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Income Statement</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Revenue</h4>
                            <div className="text-sm text-gray-600">
                              Total:{' '}
                              {report.financialData.incomeStatement.totalRevenue?.toLocaleString() ||
                                0}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Expenses</h4>
                            <div className="text-sm text-gray-600">
                              Total:{' '}
                              {report.financialData.incomeStatement.totalExpenses?.toLocaleString() ||
                                0}
                              <br />
                              Net Income:{' '}
                              {report.financialData.incomeStatement.netIncome?.toLocaleString() ||
                                0}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PEARLS Analysis */}
                    {report.financialData.pearlsRatios && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">PEARLS Analysis</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>P1: {report.financialData.pearlsRatios.P1?.toFixed(2) || 0}%</div>
                          <div>E1: {report.financialData.pearlsRatios.E1?.toFixed(2) || 0}%</div>
                          <div>A1: {report.financialData.pearlsRatios.A1?.toFixed(2) || 0}%</div>
                          <div>L1: {report.financialData.pearlsRatios.L1?.toFixed(2) || 0}%</div>
                          <div>R9: {report.financialData.pearlsRatios.R9?.toFixed(2) || 0}%</div>
                          <div>S10: {report.financialData.pearlsRatios.S10?.toFixed(2) || 0}%</div>
                        </div>
                      </div>
                    )}

                    {/* Spread Rate */}
                    {report.financialData.spreadRate && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Spread Rate Analysis</h3>
                        <div className="text-sm">
                          Avg Savings Rate:{' '}
                          {report.financialData.spreadRate.avgSavingsRate?.toFixed(2) || 0}%
                          <br />
                          Avg Loan Rate:{' '}
                          {report.financialData.spreadRate.avgLoanRate?.toFixed(2) || 0}%
                          <br />
                          Spread Rate: {report.financialData.spreadRate.spreadRate?.toFixed(2) || 0}
                          %
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No financial data available. Click "Auto-Fetch Data" to load.
                  </p>
                )}
              </div>
            )}

            {/* Tab 2: Member Administration */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Member Administration (सदस्य व्यवस्थापन)
                </h2>
                {report.memberData ? (
                  <div className="space-y-4">
                    {report.memberData.statistics && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Member Statistics</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>Total Members: {report.memberData.statistics.totalMembers || 0}</div>
                          <div>
                            Active Members: {report.memberData.statistics.activeMembers || 0}
                          </div>
                          <div>New Members: {report.memberData.statistics.newMembers || 0}</div>
                          <div>
                            Closed Members: {report.memberData.statistics.closedMembers || 0}
                          </div>
                        </div>
                      </div>
                    )}

                    {report.memberData.top20Depositors &&
                      report.memberData.top20Depositors.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h3 className="font-semibold mb-2">Top 20 Depositors</h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr>
                                  <th className="text-left">Member</th>
                                  <th className="text-right">Balance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.memberData.top20Depositors
                                  .slice(0, 20)
                                  .map((dep: any, idx: number) => (
                                    <tr key={idx}>
                                      <td>{dep.memberName}</td>
                                      <td className="text-right">
                                        {dep.balance?.toLocaleString() || 0}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No member data available. Click "Auto-Fetch Data" to load.
                  </p>
                )}
              </div>
            )}

            {/* Tab 3: Loans & Recovery */}
            {activeTab === 'loans' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Loans & Recovery (कर्जा तथा असुली)
                </h2>
                {report.loanData ? (
                  <div className="space-y-4">
                    {report.loanData.approvalsByLevel && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Loan Approvals by Level</h3>
                        <div className="text-sm">
                          Manager: {report.loanData.approvalsByLevel.managerApproved?.count || 0}{' '}
                          loans,{' '}
                          {report.loanData.approvalsByLevel.managerApproved?.totalAmount?.toLocaleString() ||
                            0}
                          <br />
                          Committee:{' '}
                          {report.loanData.approvalsByLevel.committeeApproved?.count ||
                            0} loans,{' '}
                          {report.loanData.approvalsByLevel.committeeApproved?.totalAmount?.toLocaleString() ||
                            0}
                          <br />
                          Board: {report.loanData.approvalsByLevel.boardApproved?.count ||
                            0} loans,{' '}
                          {report.loanData.approvalsByLevel.boardApproved?.totalAmount?.toLocaleString() ||
                            0}
                        </div>
                      </div>
                    )}

                    {report.loanData.overdueLoans && report.loanData.overdueLoans.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Overdue Loans (31+ days)</h3>
                        <div className="text-sm">Count: {report.loanData.overdueLoans.length}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No loan data available. Click "Auto-Fetch Data" to load.
                  </p>
                )}
              </div>
            )}

            {/* Tab 4: Liquidity & Liabilities */}
            {activeTab === 'liquidity' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Liquidity & Liabilities (तरलता तथा दायित्व)
                </h2>
                {report.liquidityData ? (
                  <div className="space-y-4">
                    {report.liquidityData.top20Borrowers &&
                      report.liquidityData.top20Borrowers.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h3 className="font-semibold mb-2">Top 20 Borrowers</h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr>
                                  <th className="text-left">Member</th>
                                  <th className="text-right">Outstanding</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.liquidityData.top20Borrowers
                                  .slice(0, 20)
                                  .map((borrower: any, idx: number) => (
                                    <tr key={idx}>
                                      <td>{borrower.memberName}</td>
                                      <td className="text-right">
                                        {borrower.outstandingAmount?.toLocaleString() || 0}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No liquidity data available. Click "Auto-Fetch Data" to load.
                  </p>
                )}
              </div>
            )}

            {/* Tab 5: Governance & Operations */}
            {activeTab === 'governance' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Governance & Operations (सुशासन तथा विविध)
                </h2>

                {/* Narrative Sections */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manager's Overall Analysis (व्यवस्थापकको विश्लेषण)
                    </label>
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Enter overall analysis..."
                      readOnly={isFinalized}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Challenges (समस्या र चुनौतीहरू)
                    </label>
                    <RichTextEditor
                      value={challenges}
                      onChange={setChallenges}
                      placeholder="Enter challenges and problems..."
                      readOnly={isFinalized}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Future Plans (आगामी योजना)
                    </label>
                    <RichTextEditor
                      value={plans}
                      onChange={setPlans}
                      placeholder="Enter future plans..."
                      readOnly={isFinalized}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manager's Suggestions (व्यवस्थापकको सुझाव)
                    </label>
                    <RichTextEditor
                      value={suggestions}
                      onChange={setSuggestions}
                      placeholder="Enter suggestions to the board..."
                      readOnly={isFinalized}
                    />
                  </div>
                </div>

                {/* Governance Data Display */}
                {report.governanceData && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Committee Meetings</h3>
                    <div className="text-sm">
                      Total Meetings: {report.governanceData.committeeMeetings?.totalMeetings || 0}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modals */}
        <ConfirmModal
          isOpen={showFetchConfirm}
          title="Auto-Fetch Data"
          message="This will overwrite your current financial data with the latest system values. Any manual adjustments you've made will be lost. Are you sure?"
          onConfirm={handleFetchData}
          onCancel={() => setShowFetchConfirm(false)}
          confirmText="Fetch Data"
          cancelText="Cancel"
          confirmButtonClass="bg-blue-600 hover:bg-blue-700"
        />

        <ConfirmModal
          isOpen={showFinalizeConfirm}
          title="Finalize Report"
          message="Are you sure you want to finalize this report? Once finalized, the data will be locked and cannot be changed. A snapshot of all current data will be saved."
          onConfirm={handleFinalize}
          onCancel={() => setShowFinalizeConfirm(false)}
          confirmText="Finalize"
          cancelText="Cancel"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      </div>
    </ProtectedRoute>
  );
}
