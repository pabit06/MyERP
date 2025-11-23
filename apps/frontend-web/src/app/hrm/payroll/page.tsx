'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function PayrollPage() {
  const { token } = useAuth();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState('2082/83');
  const [monthBs, setMonthBs] = useState(4); // Shrawan

  useEffect(() => {
    if (!token) return;
    fetchRuns();
  }, [token, fiscalYear, monthBs]);

  const fetchRuns = async () => {
    try {
      const response = await fetch(
        `${API_URL}/hrm/payroll/runs?fiscalYear=${fiscalYear}&monthBs=${monthBs}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setRuns(data.runs || []);
      }
    } catch (error) {
      console.error('Error fetching payroll runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await fetch(`${API_URL}/hrm/payroll/runs/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fiscalYear, monthBs }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Preview:', data);
        // TODO: Show preview modal
      }
    } catch (error) {
      console.error('Error previewing payroll:', error);
    }
  };

  const handleCreateRun = async () => {
    try {
      const response = await fetch(`${API_URL}/hrm/payroll/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fiscalYear, monthBs }),
      });
      if (response.ok) {
        await fetchRuns();
      }
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
      const response = await fetch(`${API_URL}/hrm/payroll/runs/${runId}/finalize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        await fetchRuns();
      }
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
