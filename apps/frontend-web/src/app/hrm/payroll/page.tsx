'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PayrollPreviewModal from '@/components/PayrollPreviewModal';
import { apiClient } from '@/lib/api';

interface PayrollPreview {
  preview: Array<{
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    basicSalary: number;
    allowances: number;
    grossSalary: number;
    ssfEmployee: number;
    ssfEmployer: number;
    taxTds: number;
    loanDeduction: number;
    netSalary: number;
  }>;
  totals: {
    totalBasic: number;
    totalNetPay: number;
    totalSSF: number;
    totalTDS: number;
  };
}

export default function PayrollPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState('2082/83');
  const [monthBs, setMonthBs] = useState(4); // Shrawan
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PayrollPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchRuns();
  }, [fiscalYear, monthBs]);

  const fetchRuns = async () => {
    try {
      const data = await apiClient.get<{ runs: any[] }>(
        `/hrm/payroll/runs?fiscalYear=${fiscalYear}&monthBs=${monthBs}`
      );
      setRuns(data.runs || []);
    } catch (error) {
      console.error('Error fetching payroll runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const data = await apiClient.post<PayrollPreview>('/hrm/payroll/runs/preview', {
        fiscalYear,
        monthBs,
      });
      setPreviewData(data);
    } catch (error: any) {
      alert(error.message || 'Failed to load preview');
      setShowPreview(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreateRun = async () => {
    try {
      await apiClient.post('/hrm/payroll/runs', { fiscalYear, monthBs });
      await fetchRuns();
    } catch (error) {
      console.error('Error creating payroll run:', error);
    }
  };

  const handleFinalize = async (runId: string) => {
    if (
      !confirm('Are you sure you want to finalize this payroll run? This action cannot be undone.')
    ) {
      return;
    }
    try {
      await apiClient.post(`/hrm/payroll/runs/${runId}/finalize`);
      await fetchRuns();
    } catch (error) {
      console.error('Error finalizing payroll run:', error);
    }
  };

  const monthNames = [
    'Baishakh',
    'Jestha',
    'Ashadh',
    'Shrawan',
    'Bhadra',
    'Ashwin',
    'Kartik',
    'Mangsir',
    'Poush',
    'Magh',
    'Falgun',
    'Chaitra',
  ];

  return (
    <div className="p-6">
      <PayrollPreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewData(null);
        }}
        preview={previewData}
        loading={previewLoading}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payroll Management</h1>
        <div className="flex gap-4">
          <input
            type="text"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            placeholder="Fiscal Year (e.g., 2082/83)"
            className="border rounded px-3 py-2"
          />
          <select
            value={monthBs}
            onChange={(e) => setMonthBs(parseInt(e.target.value))}
            className="border rounded px-3 py-2"
          >
            {monthNames.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={handlePreview}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Preview
          </button>
          <button
            onClick={handleCreateRun}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Create Run
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fiscal Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Basic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Net Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{run.fiscalYear}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{monthNames[run.monthBs - 1]}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        run.status === 'FINALIZED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    Rs. {run.totalBasic.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    Rs. {run.totalNetPay.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {run.status === 'DRAFT' && (
                      <button
                        onClick={() => handleFinalize(run.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Finalize
                      </button>
                    )}
                    <Link
                      href={`/hrm/payroll/${run.id}`}
                      className="ml-4 text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
