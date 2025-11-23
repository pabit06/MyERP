'use client';

import { useEffect, useState, useRef } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';
import NepaliDateDisplay from '../../../components/NepaliDateDisplay';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Darta {
  id: string;
  dartaNumber: string;
  title: string;
  description?: string | null;
  category?: string | null;
  subject?: string | null;
  status: string;
  priority: string;
  remarks?: string | null;
  createdAt: string;
  documents: Array<{ id: string; title: string; fileName: string }>;
  _count: {
    documents: number;
    movements: number;
  };
}

interface PatraChalani {
  id: string;
  chalaniNumber: string;
  patraNumber?: string | null;
  type: string;
  subject: string;
  from?: string | null;
  to?: string | null;
  date: string;
  receivedDate?: string | null;
  sentDate?: string | null;
  priority: string;
  status: string;
  category?: string | null;
  createdAt: string;
  documents: Array<{ id: string; title: string; fileName: string }>;
  _count: {
    documents: number;
    actions: number;
  };
}

type RecordType = 'darta' | 'chalani' | 'all';

export default function DartaChalaniPage() {
  const { token, hasModule } = useAuth();
  const [dartas, setDartas] = useState<Darta[]>([]);
  const [patraChalanis, setPatraChalanis] = useState<PatraChalani[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateDartaModal, setShowCreateDartaModal] = useState(false);
  const [showCreateChalaniModal, setShowCreateChalaniModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{ type: 'darta' | 'chalani'; id: string } | null>(null);
  const [recordType, setRecordType] = useState<RecordType>('all');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    department: '',
    search: '',
    fiscalYear: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  useEffect(() => {
    if (!hasModule('dms')) {
      setError('DMS module is not enabled for your subscription');
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [token, hasModule, filters, pagination.page, recordType]);

  const fetchData = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [];

      if (recordType === 'all' || recordType === 'darta') {
        const dartaParams = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });
        if (filters.status) dartaParams.append('status', filters.status);
        if (filters.category) dartaParams.append('category', filters.category);
        if (filters.search) dartaParams.append('search', filters.search);

        promises.push(
          fetch(`${API_URL}/darta?${dartaParams.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json())
        );
      } else {
        promises.push(Promise.resolve({ dartas: [], pagination: { total: 0 } }));
      }

      if (recordType === 'all' || recordType === 'chalani') {
        const chalaniParams = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });
        if (filters.status) chalaniParams.append('status', filters.status);
        if (filters.category) chalaniParams.append('category', filters.category);
        if (filters.search) chalaniParams.append('search', filters.search);

        promises.push(
          fetch(`${API_URL}/patra-chalani?${chalaniParams.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json())
        );
      } else {
        promises.push(Promise.resolve({ patraChalanis: [], pagination: { total: 0 } }));
      }

      const [dartaData, chalaniData] = await Promise.all(promises);

      setDartas(dartaData.dartas || []);
      setPatraChalanis(chalaniData.patraChalanis || []);

      const totalDartas = dartaData.pagination?.total || 0;
      const totalChalanis = chalaniData.pagination?.total || 0;
      setPagination((prev) => ({
        ...prev,
        total: totalDartas + totalChalanis,
      }));
    } catch (err) {
      setError('Error loading records');
      toast.error('Could not fetch records.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (type: 'darta' | 'chalani', id: string, title: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const endpoint = type === 'darta' ? `/darta/${id}` : `/patra-chalani/${id}`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Record deleted successfully');
        fetchData();
      } else {
        throw new Error('Failed to delete record');
      }
    } catch (err) {
      toast.error('Failed to delete record');
    }
  };

  const handleStatusUpdate = async (type: 'darta' | 'chalani', id: string, newStatus: string) => {
    if (!token) return;

    try {
      const endpoint = type === 'darta' ? `/darta/${id}` : `/patra-chalani/${id}`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Status updated successfully');
        fetchData();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Combine and sort records
  const allRecords = [
    ...dartas.map((d) => ({ ...d, recordType: 'darta' as const, displayNumber: d.dartaNumber })),
    ...patraChalanis.map((pc) => ({
      ...pc,
      recordType: 'chalani' as const,
      displayNumber: pc.chalaniNumber,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Get current fiscal year (Nepali year)
  const getFiscalYear = () => {
    const year = new Date().getFullYear();
    const nepaliYear = year + 57;
    return `${String(nepaliYear - 1).slice(-2)}/${String(nepaliYear).slice(-2)}`;
  };

  if (error && !hasModule('dms')) {
    return (
      <ProtectedRoute requiredModule="dms">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredModule="dms">
      <Toaster position="top-right" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/documents" className="text-indigo-600 hover:text-indigo-800 text-sm">
                ← Documents
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Darta / Chalani (दर्ता / चलानी)</h1>
            <p className="mt-1 text-sm text-gray-500">
              Office ma aayeka patra haru (Darta) ra office bata pathaune patra haru (Chalani)
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateDartaModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + Create Darta
            </button>
            <button
              onClick={() => setShowCreateChalaniModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create Chalani
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={recordType}
                onChange={(e) => {
                  setRecordType(e.target.value as RecordType);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All (Darta + Chalani)</option>
                <option value="darta">Darta (दर्ता)</option>
                <option value="chalani">Chalani (चलानी)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by subject, number..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Done</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <input
                type="text"
                placeholder="Category"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Show</label>
              <select
                value={pagination.limit}
                onChange={(e) => {
                  setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Records List */}
        {isLoading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading records...</p>
          </div>
        ) : allRecords.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No records found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first Darta or Chalani</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCreateDartaModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Darta
              </button>
              <button
                onClick={() => setShowCreateChalaniModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Chalani
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-green-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      कागजात ने (Document No.)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      आर्थिक बर्ष (Fiscal Year)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      बिभाग (Department)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      मिति (Date)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      बिषय (Subject)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      कार्यालय / नाम, ठेगाना (Office / Name, Address)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      सम्बन्धित कर्मचारी (Related Employee)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      अवस्था (Status)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold text-white mr-2 ${
                              record.recordType === 'darta' ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                          >
                            {record.recordType === 'darta' ? 'D' : 'C'}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {record.recordType === 'darta' ? 'दर्ता:' : 'चलानी:'}{' '}
                              {record.displayNumber.split('-').pop()}
                            </div>
                            {record.recordType === 'chalani' && (record as PatraChalani).patraNumber && (
                              <div className="text-xs text-gray-500">
                                Ref: {(record as PatraChalani).patraNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getFiscalYear()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.category || record.recordType === 'darta'
                          ? (record as Darta).category || '-'
                          : (record as PatraChalani).category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <NepaliDateDisplay
                          date={
                            record.recordType === 'darta'
                              ? record.createdAt
                              : (record as PatraChalani).date
                          }
                          showBs={true}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {record.recordType === 'darta'
                            ? (record as Darta).title || (record as Darta).subject || '-'
                            : (record as PatraChalani).subject}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {record.recordType === 'darta' ? (
                            <span className="text-gray-500">-</span>
                          ) : (
                            <>
                              {(record as PatraChalani).type === 'incoming' ? (
                                <>
                                  <span className="text-gray-500">From:</span>{' '}
                                  {(record as PatraChalani).from || '-'}
                                </>
                              ) : (
                                <>
                                  <span className="text-gray-500">To:</span>{' '}
                                  {(record as PatraChalani).to || '-'}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.status === 'completed' || record.status === 'done'
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'pending'
                              ? 'bg-red-100 text-red-800'
                              : record.status === 'in_progress' || record.status === 'active'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {record.status === 'completed' ? 'Done' : record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative group">
                            <button className="text-gray-600 hover:text-gray-900">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                />
                              </svg>
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
                              <div className="py-1">
                                <button
                                  onClick={() => setSelectedRecord({ type: record.recordType, id: record.id })}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Show
                                </button>
                                <button
                                  onClick={() => {
                                    if (record.recordType === 'darta') {
                                      // Handle edit darta
                                    } else {
                                      // Handle edit chalani
                                    }
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Edit
                                </button>
                                {(record.status === 'pending' || record.status === 'active') && (
                                  <button
                                    onClick={() =>
                                      handleStatusUpdate(
                                        record.recordType,
                                        record.id,
                                        record.status === 'completed' ? 'pending' : 'completed'
                                      )
                                    }
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    {record.status === 'completed' ? 'Mark Pending' : 'Done'}
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    handleDelete(
                                      record.recordType,
                                      record.id,
                                      record.recordType === 'darta'
                                        ? (record as Darta).title
                                        : (record as PatraChalani).subject
                                    )
                                  }
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
            <div className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} row(s).
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page * pagination.limit >= pagination.total}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Create Darta Modal */}
        {showCreateDartaModal && (
          <CreateDartaModal
            isOpen={showCreateDartaModal}
            onClose={() => {
              setShowCreateDartaModal(false);
            }}
            onSuccess={() => {
              fetchData();
              setShowCreateDartaModal(false);
            }}
          />
        )}

        {/* Create Chalani Modal */}
        {showCreateChalaniModal && (
          <CreateChalaniModal
            isOpen={showCreateChalaniModal}
            onClose={() => {
              setShowCreateChalaniModal(false);
            }}
            onSuccess={() => {
              fetchData();
              setShowCreateChalaniModal(false);
            }}
          />
        )}

        {/* View Modal */}
        {selectedRecord && (
          <ViewRecordModal
            type={selectedRecord.type}
            id={selectedRecord.id}
            isOpen={!!selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onUpdate={fetchData}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// Create Darta Modal
function CreateDartaModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subject: '',
    priority: 'normal',
    remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/darta`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Darta created successfully');
        onSuccess();
      } else {
        throw new Error('Failed to create darta');
      }
    } catch (err) {
      toast.error('Failed to create darta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Darta (दर्ता)</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Create Chalani Modal
function CreateChalaniModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    type: 'outgoing',
    subject: '',
    to: '',
    date: new Date().toISOString().split('T')[0],
    sentDate: '',
    priority: 'normal',
    status: 'pending',
    category: '',
    patraNumber: '',
    remarks: '',
    department: '',
    userId: '',
    fiscalYear: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current fiscal year (Nepali)
  const getCurrentFiscalYear = () => {
    const year = new Date().getFullYear();
    const nepaliYear = year + 57;
    return `${String(nepaliYear - 1).slice(-2)}/${String(nepaliYear).slice(-2)}`;
  };

  useEffect(() => {
    if (isOpen && token) {
      setFormData((prev) => ({ ...prev, fiscalYear: getCurrentFiscalYear() }));
      fetchDepartments();
      fetchUsers();
    }
  }, [isOpen, token]);

  const fetchDepartments = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/hrm/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/hrm/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.employees || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    try {
      // First create the patra chalani
      const response = await fetch(`${API_URL}/patra-chalani`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          category: formData.department, // Use department as category
          status: formData.status,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const patraChalaniId = data.patraChalani?.id;

        // If file is uploaded, upload it
        if (file && patraChalaniId) {
          const formDataUpload = new FormData();
          formDataUpload.append('file', file);
          formDataUpload.append('title', file.name);

          const uploadResponse = await fetch(`${API_URL}/patra-chalani/${patraChalaniId}/upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formDataUpload,
          });

          if (!uploadResponse.ok) {
            console.error('File upload failed');
          }
        }

        toast.success('Chalani created successfully');
        setFile(null);
        onSuccess();
      } else {
        throw new Error('Failed to create chalani');
      }
    } catch (err) {
      toast.error('Failed to create chalani');
    } finally {
      setSubmitting(false);
    }
  };

  // Convert date to Nepali format (2082-08-06)
  const convertToNepaliDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear() + 57;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-green-50 to-white rounded-xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl border-4 border-green-600">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-1">Create Darta/Chalani</h2>
              <p className="text-green-100 text-sm font-medium">नयाँ पत्र चलानी</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(95vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                    आर्थिक बर्ष <span className="text-red-500">*</span> (Fiscal Year)
                  </label>
                  <select
                    value={formData.fiscalYear}
                    onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                  >
                    <option value={getCurrentFiscalYear()}>{getCurrentFiscalYear()}</option>
                    <option value="081/082">081/082</option>
                    <option value="080/081">080/081</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                    <span>पठाउने कार्यालय/व्यक्तिको नाम, ठेगाना</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                  </label>
                  <select
                    value={formData.to}
                    onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                  >
                    <option value="">Select...</option>
                    <option value="Office 1">Office 1</option>
                    <option value="Office 2">Office 2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                    विभाग <span className="text-red-500">*</span> (Department)
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                  >
                    <option value="">Select...</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                    कैफियत (Remarks)
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm resize-none hover:border-green-400"
                    placeholder="Enter remarks..."
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                    चलानी नं <span className="text-red-500">*</span> (Dispatch No.)
                  </label>
                  <input
                    type="text"
                    value={formData.patraNumber || '18'}
                    onChange={(e) => setFormData({ ...formData, patraNumber: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                    <span>पत्रको मिति <span className="text-red-500">*</span> (Letter Date)</span>
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                  >
                    <option value="">Select...</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                    बिषय <span className="text-red-500">*</span> (Subject)
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                    placeholder="Enter subject..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                    Add User <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                  >
                    <option value="">Select...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}{' '}
                        {user.employeeId ? `(${user.employeeId})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5">File</label>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      dragActive
                        ? 'border-green-500 bg-green-50 scale-[1.02]'
                        : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      className="hidden"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded">
                        Files {file ? '1' : '0'}/1
                      </span>
                      {file && (
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full p-1 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="mt-4">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400 mb-3"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-gray-700 font-medium mb-1">Drop your files here</p>
                      <p className="text-xs text-gray-500 mb-4">
                        Allowed types: image/jpeg, image/png, image/jpg, application/pdf
                      </p>
                      {!file && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                        >
                          Browse Files
                        </button>
                      )}
                      {file && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-green-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-5 h-5 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 mt-8 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// View Record Modal
function ViewRecordModal({
  type,
  id,
  isOpen,
  onClose,
  onUpdate,
}: {
  type: 'darta' | 'chalani';
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { token } = useAuth();
  const [recordDetails, setRecordDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && id) {
      fetchRecordDetails();
    }
  }, [isOpen, id, type]);

  const fetchRecordDetails = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const endpoint = type === 'darta' ? `/darta/${id}` : `/patra-chalani/${id}`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecordDetails(type === 'darta' ? data.darta : data.patraChalani);
      }
    } catch (err) {
      console.error('Error fetching record details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {type === 'darta' ? 'Darta Details' : 'Chalani Details'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : recordDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {type === 'darta' ? 'Darta Number' : 'Chalani Number'}
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {type === 'darta' ? recordDetails.dartaNumber : recordDetails.chalaniNumber}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm text-gray-900">{recordDetails.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {type === 'darta' ? 'Title' : 'Subject'}
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {type === 'darta' ? recordDetails.title : recordDetails.subject}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <p className="mt-1 text-sm text-gray-900">{recordDetails.priority}</p>
                </div>
              </div>

              {recordDetails.documents && recordDetails.documents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
                  <div className="space-y-2">
                    {recordDetails.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm text-gray-900">{doc.title || doc.fileName}</span>
                        <a
                          href={`${API_URL}/${type === 'darta' ? 'darta' : 'patra-chalani'}/${id}/download/${doc.id}`}
                          target="_blank"
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

