'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import NepaliDateDisplay from '@/components/NepaliDateDisplay';

interface TtrReport {
  id: string;
  forDate: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    memberNumber: string;
  };
  totalAmount: string;
  status: string;
  deadline: string;
  remarks?: string;
  xmlPath?: string;
  sourceOfFunds?: {
    id: string;
    declaredText: string;
    attachmentPath?: string;
  };
}

export default function TtrQueue() {
  const { token } = useAuth();
  const [ttrReports, setTtrReports] = useState<TtrReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    fetchTtrReports();
  }, [token]);

  const fetchTtrReports = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/ttr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTtrReports(data.ttrReports || []);
    } catch (error) {
      console.error('Error fetching TTR reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateXml = async (ttrId: string) => {
    setGenerating(ttrId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/ttr/${ttrId}/generate-xml`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        alert('XML generated successfully');
        fetchTtrReports();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating XML:', error);
      alert('Failed to generate XML');
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadXml = (ttrId: string) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/ttr/${ttrId}/xml`, '_blank');
  };

  const handleReject = async (ttrId: string, reason: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/ttr/${ttrId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected', remarks: reason }),
      });

      if (res.ok) {
        alert('TTR rejected');
        fetchTtrReports();
      }
    } catch (error) {
      console.error('Error rejecting TTR:', error);
    }
  };

  return (
    <ProtectedRoute requiredModule="compliance">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">TTR Queue</h1>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SOF Declaration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ttrReports.map((ttr) => (
                  <tr key={ttr.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <NepaliDateDisplay date={ttr.forDate} showBs={true} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ttr.member.firstName} {ttr.member.lastName} ({ttr.member.memberNumber})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {parseFloat(ttr.totalAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ttr.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : ttr.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ttr.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <NepaliDateDisplay date={ttr.deadline} showBs={true} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ttr.sourceOfFunds ? (
                        <div>
                          <p className="text-xs">
                            {ttr.sourceOfFunds.declaredText.substring(0, 50)}...
                          </p>
                          {ttr.sourceOfFunds.attachmentPath && (
                            <a
                              href={ttr.sourceOfFunds.attachmentPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              View Document
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-yellow-600 text-xs">Not declared</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {ttr.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleGenerateXml(ttr.id)}
                            disabled={generating === ttr.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            {generating === ttr.id ? 'Generating...' : 'Generate XML'}
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) handleReject(ttr.id, reason);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {ttr.xmlPath && (
                        <button
                          onClick={() => handleDownloadXml(ttr.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Download XML
                        </button>
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
