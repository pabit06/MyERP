'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/features/components/shared';

interface AmlCase {
  id: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    memberNumber: string;
  };
  type: string;
  status: string;
  notes?: string;
  createdAt: string;
  closedAt?: string;
}

export default function AmlCases() {
  const { token } = useAuth();
  const [cases, setCases] = useState<AmlCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', type: '' });

  const fetchCases = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.type) params.append('type', filter.type);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/cases?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      setCases(data.cases || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    if (!token) return;

    fetchCases();
  }, [token, fetchCases]);

  const handleCloseCase = async (caseId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/cases/${caseId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'closed' }),
      });

      if (res.ok) {
        fetchCases();
      }
    } catch (error) {
      console.error('Error closing case:', error);
    }
  };

  const handleGenerateStr = async (caseId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/cases/${caseId}/generate-str`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        alert('STR XML generated successfully');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating STR:', error);
      alert('Failed to generate STR XML');
    }
  };

  return (
    <ProtectedRoute requiredModule="compliance">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Confidentiality Warning:</strong> Access to this page is logged and audited
                under Section 44k of the Act. Unauthorized disclosure of STR information is
                prohibited.
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-8">Suspicious Cases</h1>

        <div className="mb-4 flex gap-4">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="STR">STR</option>
            <option value="SUSPICIOUS_ATTEMPT">Suspicious Attempt</option>
            <option value="HIGH_RISK">High Risk</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cases.map((caseItem) => (
                  <tr key={caseItem.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {caseItem.member.firstName} {caseItem.member.lastName} (
                      {caseItem.member.memberNumber})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {caseItem.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          caseItem.status === 'open'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {caseItem.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(caseItem.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {caseItem.status === 'open' && (
                        <>
                          <button
                            onClick={() => handleGenerateStr(caseItem.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Generate STR
                          </button>
                          <button
                            onClick={() => handleCloseCase(caseItem.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Close
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
