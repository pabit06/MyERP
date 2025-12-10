'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  financialData: Record<string, unknown> | null;
  previousMonthData: Record<string, unknown> | null;
  memberData: Record<string, unknown> | null;
  loanData: Record<string, unknown> | null;
  liquidityData: Record<string, unknown> | null;
  governanceData: Record<string, unknown> | null;
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

interface Depositor {
  memberName: string;
  balance?: number;
  [key: string]: unknown;
}

interface Borrower {
  memberName: string;
  outstandingAmount?: number;
  [key: string]: unknown;
}

type TabType = 'financial' | 'members' | 'loans' | 'liquidity' | 'governance';

// Helper functions to safely access nested properties from Record<string, unknown>
function getNestedValue(obj: Record<string, unknown> | null | undefined, path: string): unknown {
  if (!obj) return undefined;
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function getString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export default function ReportDetailPage() {
  const params = useParams();
  const { hasModule, isAuthenticated, isLoading: authLoading } = useAuth();
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

  const fetchReportDetails = useCallback(async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      const data = await apiClient.get<{ report: ManagerReport }>(
        `/governance/reports/${params.id}`
      );
      setReport(data.report);
      setError(null);
    } catch (error: unknown) {
      console.error('Error fetching report details:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch report details');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && params.id) {
      fetchReportDetails();
    }
  }, [authLoading, isAuthenticated, params.id, fetchReportDetails]);

  useEffect(() => {
    if (report) {
      setDescription(report.description || '');
      setChallenges(report.challenges || '');
      setPlans(report.plans || '');
      setSuggestions(report.suggestions || '');
    }
  }, [report]);

  const handleFetchData = async () => {
    if (!params.id) return;
    setFetchingData(true);
    try {
      await apiClient.post(`/governance/reports/${params.id}/fetch-data`);
      await fetchReportDetails();
      alert('Data fetched successfully!');
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Error fetching data');
    } finally {
      setFetchingData(false);
      setShowFetchConfirm(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!params.id || !report) return;
    setSaving(true);
    try {
      await apiClient.put(`/governance/reports/${params.id}`, {
        description,
        challenges,
        plans,
        suggestions,
      });
      await fetchReportDetails();
      alert('Report saved successfully!');
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Error saving report');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!params.id) return;
    setFinalizing(true);
    try {
      await apiClient.post(`/governance/reports/${params.id}/finalize`);
      await fetchReportDetails();
      alert('Report finalized successfully!');
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Error finalizing report');
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
                    {getNestedValue(report.financialData, 'balanceSheet') !== undefined && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Balance Sheet</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Assets</h4>
                            <div className="text-sm text-gray-600">
                              Total:{' '}
                              {(
                                getNumber(
                                  getNestedValue(report.financialData, 'balanceSheet.totalAssets')
                                ) || 0
                              ).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Liabilities & Equity</h4>
                            <div className="text-sm text-gray-600">
                              Liabilities:{' '}
                              {(
                                getNumber(
                                  getNestedValue(
                                    report.financialData,
                                    'balanceSheet.totalLiabilities'
                                  )
                                ) || 0
                              ).toLocaleString()}
                              <br />
                              Equity:{' '}
                              {(
                                getNumber(
                                  getNestedValue(report.financialData, 'balanceSheet.totalEquity')
                                ) || 0
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Income Statement */}
                    {getNestedValue(report.financialData, 'incomeStatement') !== undefined && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Income Statement</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Revenue</h4>
                            <div className="text-sm text-gray-600">
                              Total:{' '}
                              {(
                                getNumber(
                                  getNestedValue(
                                    report.financialData,
                                    'incomeStatement.totalRevenue'
                                  )
                                ) || 0
                              ).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Expenses</h4>
                            <div className="text-sm text-gray-600">
                              Total:{' '}
                              {(
                                getNumber(
                                  getNestedValue(
                                    report.financialData,
                                    'incomeStatement.totalExpenses'
                                  )
                                ) || 0
                              ).toLocaleString()}
                              <br />
                              Net Income:{' '}
                              {(
                                getNumber(
                                  getNestedValue(report.financialData, 'incomeStatement.netIncome')
                                ) || 0
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PEARLS Analysis */}
                    {getNestedValue(report.financialData, 'pearlsRatios') !== undefined && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">PEARLS Analysis</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            P1:{' '}
                            {(
                              getNumber(getNestedValue(report.financialData, 'pearlsRatios.P1')) ||
                              0
                            ).toFixed(2)}
                            %
                          </div>
                          <div>
                            E1:{' '}
                            {(
                              getNumber(getNestedValue(report.financialData, 'pearlsRatios.E1')) ||
                              0
                            ).toFixed(2)}
                            %
                          </div>
                          <div>
                            A1:{' '}
                            {(
                              getNumber(getNestedValue(report.financialData, 'pearlsRatios.A1')) ||
                              0
                            ).toFixed(2)}
                            %
                          </div>
                          <div>
                            L1:{' '}
                            {(
                              getNumber(getNestedValue(report.financialData, 'pearlsRatios.L1')) ||
                              0
                            ).toFixed(2)}
                            %
                          </div>
                          <div>
                            R9:{' '}
                            {(
                              getNumber(getNestedValue(report.financialData, 'pearlsRatios.R9')) ||
                              0
                            ).toFixed(2)}
                            %
                          </div>
                          <div>
                            S10:{' '}
                            {(
                              getNumber(getNestedValue(report.financialData, 'pearlsRatios.S10')) ||
                              0
                            ).toFixed(2)}
                            %
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Spread Rate */}
                    {getNestedValue(report.financialData, 'spreadRate') !== undefined && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Spread Rate Analysis</h3>
                        <div className="text-sm">
                          Avg Savings Rate:{' '}
                          {(
                            getNumber(
                              getNestedValue(report.financialData, 'spreadRate.avgSavingsRate')
                            ) || 0
                          ).toFixed(2)}
                          %
                          <br />
                          Avg Loan Rate:{' '}
                          {(
                            getNumber(
                              getNestedValue(report.financialData, 'spreadRate.avgLoanRate')
                            ) || 0
                          ).toFixed(2)}
                          %
                          <br />
                          Spread Rate:{' '}
                          {(
                            getNumber(
                              getNestedValue(report.financialData, 'spreadRate.spreadRate')
                            ) || 0
                          ).toFixed(2)}
                          %
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No financial data available. Click &quot;Auto-Fetch Data&quot; to load.
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
                    {getNestedValue(report.memberData, 'statistics') !== undefined && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Member Statistics</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            Total Members:{' '}
                            {getNumber(
                              getNestedValue(report.memberData, 'statistics.totalMembers')
                            ) || 0}
                          </div>
                          <div>
                            Active Members:{' '}
                            {getNumber(
                              getNestedValue(report.memberData, 'statistics.activeMembers')
                            ) || 0}
                          </div>
                          <div>
                            New Members:{' '}
                            {getNumber(
                              getNestedValue(report.memberData, 'statistics.newMembers')
                            ) || 0}
                          </div>
                          <div>
                            Closed Members:{' '}
                            {getNumber(
                              getNestedValue(report.memberData, 'statistics.closedMembers')
                            ) || 0}
                          </div>
                        </div>
                      </div>
                    )}

                    {(() => {
                      const top20Depositors = getNestedValue(report.memberData, 'top20Depositors');
                      return (
                        isArray(top20Depositors) &&
                        top20Depositors.length > 0 && (
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
                                  {(top20Depositors as Depositor[])
                                    .slice(0, 20)
                                    .map((dep: Depositor, idx: number) => (
                                      <tr key={idx}>
                                        <td>{getString(dep.memberName) || '-'}</td>
                                        <td className="text-right">
                                          {(getNumber(dep.balance) || 0).toLocaleString()}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No member data available. Click &quot;Auto-Fetch Data&quot; to load.
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
                    {getNestedValue(report.loanData, 'approvalsByLevel') !== undefined && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Loan Approvals by Level</h3>
                        <div className="text-sm">
                          Manager:{' '}
                          {getNumber(
                            getNestedValue(
                              report.loanData,
                              'approvalsByLevel.managerApproved.count'
                            )
                          ) || 0}{' '}
                          loans,{' '}
                          {(
                            getNumber(
                              getNestedValue(
                                report.loanData,
                                'approvalsByLevel.managerApproved.totalAmount'
                              )
                            ) || 0
                          ).toLocaleString()}
                          <br />
                          Committee:{' '}
                          {getNumber(
                            getNestedValue(
                              report.loanData,
                              'approvalsByLevel.committeeApproved.count'
                            )
                          ) || 0}{' '}
                          loans,{' '}
                          {(
                            getNumber(
                              getNestedValue(
                                report.loanData,
                                'approvalsByLevel.committeeApproved.totalAmount'
                              )
                            ) || 0
                          ).toLocaleString()}
                          <br />
                          Board:{' '}
                          {getNumber(
                            getNestedValue(report.loanData, 'approvalsByLevel.boardApproved.count')
                          ) || 0}{' '}
                          loans,{' '}
                          {(
                            getNumber(
                              getNestedValue(
                                report.loanData,
                                'approvalsByLevel.boardApproved.totalAmount'
                              )
                            ) || 0
                          ).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {(() => {
                      const overdueLoans = getNestedValue(report.loanData, 'overdueLoans');
                      return (
                        isArray(overdueLoans) &&
                        overdueLoans.length > 0 && (
                          <div className="border rounded-lg p-4">
                            <h3 className="font-semibold mb-2">Overdue Loans (31+ days)</h3>
                            <div className="text-sm">Count: {overdueLoans.length}</div>
                          </div>
                        )
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No loan data available. Click &quot;Auto-Fetch Data&quot; to load.
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
                    {(() => {
                      const top20Borrowers = getNestedValue(report.liquidityData, 'top20Borrowers');
                      return (
                        isArray(top20Borrowers) &&
                        top20Borrowers.length > 0 && (
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
                                  {(top20Borrowers as Borrower[])
                                    .slice(0, 20)
                                    .map((borrower: Borrower, idx: number) => (
                                      <tr key={idx}>
                                        <td>{getString(borrower.memberName) || '-'}</td>
                                        <td className="text-right">
                                          {(
                                            getNumber(borrower.outstandingAmount) || 0
                                          ).toLocaleString()}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No liquidity data available. Click &quot;Auto-Fetch Data&quot; to load.
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
                      Total Meetings:{' '}
                      {getNumber(
                        getNestedValue(report.governanceData, 'committeeMeetings.totalMeetings')
                      ) || 0}
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
