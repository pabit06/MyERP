'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

interface RiskReport {
  year: number;
  totalMembers: number;
  byRiskCategory: {
    high: number;
    medium: number;
    low: number;
  };
  byRiskFactor: Record<string, number>;
  pepCount: number;
  byGeography: Record<string, number>;
  byOccupation: Record<string, number>;
}

export default function RiskReport() {
  const { token } = useAuth();
  const [report, setReport] = useState<RiskReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!token) return;

    fetchReport();
  }, [token, year]);

  const fetchReport = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/risk-report?year=${year}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      setReport(data.report);
    } catch (error) {
      console.error('Error fetching risk report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!report) return;

    const reportText = `
Schedule-3 Annual Institutional Risk Assessment Report
Year: ${report.year}

Total Members: ${report.totalMembers}

Risk Category Breakdown:
- High Risk: ${report.byRiskCategory.high}
- Medium Risk: ${report.byRiskCategory.medium}
- Low Risk: ${report.byRiskCategory.low}

PEP Count: ${report.pepCount}

Risk Factors:
${Object.entries(report.byRiskFactor)
  .map(([factor, count]) => `- ${factor}: ${count}`)
  .join('\n')}

Geography Breakdown:
${Object.entries(report.byGeography)
  .map(([country, count]) => `- ${country}: ${count}`)
  .join('\n')}

Occupation Breakdown:
${Object.entries(report.byOccupation)
  .map(([occupation, count]) => `- ${occupation}: ${count}`)
  .join('\n')}
    `;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-report-${year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ProtectedRoute requiredModule="compliance">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Schedule-3 Risk Report</h1>
          <div className="flex gap-4">
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="border rounded px-3 py-2"
              min="2020"
              max={new Date().getFullYear()}
            />
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Export Report
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : report ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Members</p>
                  <p className="text-2xl font-bold">{report.totalMembers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">High Risk</p>
                  <p className="text-2xl font-bold text-red-600">{report.byRiskCategory.high}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Medium Risk</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {report.byRiskCategory.medium}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Low Risk</p>
                  <p className="text-2xl font-bold text-green-600">{report.byRiskCategory.low}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Risk Factors</h2>
              <div className="space-y-2">
                {Object.entries(report.byRiskFactor).map(([factor, count]) => (
                  <div key={factor} className="flex justify-between">
                    <span>{factor}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Geography Breakdown</h2>
              <div className="space-y-2">
                {Object.entries(report.byGeography).map(([country, count]) => (
                  <div key={country} className="flex justify-between">
                    <span>{country}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Occupation Breakdown</h2>
              <div className="space-y-2">
                {Object.entries(report.byOccupation).map(([occupation, count]) => (
                  <div key={occupation} className="flex justify-between">
                    <span>{occupation}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">No report data available</div>
        )}
      </div>
    </ProtectedRoute>
  );
}
