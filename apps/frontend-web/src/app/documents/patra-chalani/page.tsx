'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';
import NepaliDatePicker from '../../../components/NepaliDatePicker';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

export default function PatraChalaniPage() {
  const { token, hasModule } = useAuth();
  const [patraChalanis, setPatraChalanis] = useState<PatraChalani[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPatraChalani, setSelectedPatraChalani] = useState<PatraChalani | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    category: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  useEffect(() => {
    if (!hasModule('dms')) {
      setError('DMS module is not enabled for your subscription');
      setIsLoading(false);
      return;
    }
    fetchPatraChalanis();
  }, [token, hasModule, filters, pagination.page]);

  const fetchPatraChalanis = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`${API_URL}/patra-chalani?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPatraChalanis(data.patraChalanis || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
        }));
      } else {
        throw new Error('Failed to fetch patra chalanis');
      }
    } catch (err) {
      setError('Error loading patra chalanis');
      toast.error('Could not fetch patra chalanis.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (patraChalani: PatraChalani) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to delete "${patraChalani.subject}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/patra-chalani/${patraChalani.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Patra Chalani deleted successfully');
        fetchPatraChalanis();
      } else {
        throw new Error('Failed to delete patra chalani');
      }
    } catch (err) {
      toast.error('Failed to delete patra chalani');
    }
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
              <Link
                href="/documents"
                className="text-indigo-600 hover:text-indigo-800 text-sm"
              >
                ← Documents
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Patra Chalani (पत्र चलानी)</h1>
            <p className="mt-1 text-sm text-gray-500">Letter dispatch and correspondence management</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New Patra Chalani
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Types</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
                <option value="internal">Internal</option>
              </select>
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
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
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
          </div>
        </div>

        {/* Patra Chalani List */}
        {isLoading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading patra chalanis...</p>
          </div>
        ) : patraChalanis.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📨</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No patra chalanis found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first patra chalani</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Patra Chalani
            </button>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chalani Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From/To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patraChalanis.map((pc) => (
                  <tr key={pc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{pc.chalaniNumber}</div>
                      {pc.patraNumber && (
                        <div className="text-xs text-gray-500">Ref: {pc.patraNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          pc.type === 'incoming'
                            ? 'bg-blue-100 text-blue-800'
                            : pc.type === 'outgoing'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {pc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{pc.subject}</div>
                      {pc.category && (
                        <div className="text-xs text-gray-500">{pc.category}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {pc.type === 'incoming' ? (
                          <>
                            <span className="text-gray-500">From:</span> {pc.from || '-'}
                          </>
                        ) : (
                          <>
                            <span className="text-gray-500">To:</span> {pc.to || '-'}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(pc.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          pc.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : pc.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : pc.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {pc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedPatraChalani(pc)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(pc)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
            <div className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} patra chalanis
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page * pagination.limit >= pagination.total}
                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <CreatePatraChalaniModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setSelectedPatraChalani(null);
            }}
            onSuccess={() => {
              fetchPatraChalanis();
              setShowCreateModal(false);
            }}
            patraChalani={selectedPatraChalani}
          />
        )}

        {/* View Modal */}
        {selectedPatraChalani && !showCreateModal && (
          <ViewPatraChalaniModal
            patraChalani={selectedPatraChalani}
            isOpen={!!selectedPatraChalani}
            onClose={() => setSelectedPatraChalani(null)}
            onUpdate={fetchPatraChalanis}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// Create/Edit Patra Chalani Modal
function CreatePatraChalaniModal({
  isOpen,
  onClose,
  onSuccess,
  patraChalani,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patraChalani?: PatraChalani | null;
}) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    type: patraChalani?.type || 'incoming',
    subject: patraChalani?.subject || '',
    from: patraChalani?.from || '',
    to: patraChalani?.to || '',
    date: patraChalani?.date
      ? new Date(patraChalani.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    receivedDate: patraChalani?.receivedDate
      ? new Date(patraChalani.receivedDate).toISOString().split('T')[0]
      : '',
    sentDate: patraChalani?.sentDate
      ? new Date(patraChalani.sentDate).toISOString().split('T')[0]
      : '',
    priority: patraChalani?.priority || 'normal',
    category: patraChalani?.category || '',
    patraNumber: patraChalani?.patraNumber || '',
    remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (patraChalani) {
      setFormData({
        type: patraChalani.type,
        subject: patraChalani.subject,
        from: patraChalani.from || '',
        to: patraChalani.to || '',
        date: new Date(patraChalani.date).toISOString().split('T')[0],
        receivedDate: patraChalani.receivedDate
          ? new Date(patraChalani.receivedDate).toISOString().split('T')[0]
          : '',
        sentDate: patraChalani.sentDate
          ? new Date(patraChalani.sentDate).toISOString().split('T')[0]
          : '',
        priority: patraChalani.priority,
        category: patraChalani.category || '',
        patraNumber: patraChalani.patraNumber || '',
        remarks: '',
      });
    }
  }, [patraChalani]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    try {
      const url = patraChalani
        ? `${API_URL}/patra-chalani/${patraChalani.id}`
        : `${API_URL}/patra-chalani`;
      const method = patraChalani ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          patraChalani ? 'Patra Chalani updated successfully' : 'Patra Chalani created successfully'
        );
        onSuccess();
      } else {
        throw new Error('Failed to save patra chalani');
      }
    } catch (err) {
      toast.error('Failed to save patra chalani');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {patraChalani ? 'Edit Patra Chalani' : 'Create New Patra Chalani'}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="incoming">Incoming</option>
                  <option value="outgoing">Outgoing</option>
                  <option value="internal">Internal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {formData.type === 'incoming' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From
                </label>
                <input
                  type="text"
                  value={formData.from}
                  onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <input
                  type="text"
                  value={formData.to}
                  onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <NepaliDatePicker
                  value={formData.date}
                  onChange={(dateString) => setFormData({ ...formData, date: dateString })}
                  label="Letter Date *"
                  required
                />
              </div>

              {formData.type === 'incoming' ? (
                <div>
                  <NepaliDatePicker
                    value={formData.receivedDate || ''}
                    onChange={(dateString) => setFormData({ ...formData, receivedDate: dateString })}
                    label="Received Date"
                  />
                </div>
              ) : (
                <div>
                  <NepaliDatePicker
                    value={formData.sentDate || ''}
                    onChange={(dateString) => setFormData({ ...formData, sentDate: dateString })}
                    label="Sent Date"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patra Number
                </label>
                <input
                  type="text"
                  value={formData.patraNumber}
                  onChange={(e) => setFormData({ ...formData, patraNumber: e.target.value })}
                  placeholder="Reference letter number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
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
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : patraChalani ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// View Patra Chalani Modal
function ViewPatraChalaniModal({
  patraChalani,
  isOpen,
  onClose,
  onUpdate,
}: {
  patraChalani: PatraChalani;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { token } = useAuth();
  const [patraChalaniDetails, setPatraChalaniDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && patraChalani) {
      fetchPatraChalaniDetails();
    }
  }, [isOpen, patraChalani]);

  const fetchPatraChalaniDetails = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/patra-chalani/${patraChalani.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPatraChalaniDetails(data.patraChalani);
      }
    } catch (err) {
      console.error('Error fetching patra chalani details:', err);
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
            <h2 className="text-2xl font-bold text-gray-900">Patra Chalani Details</h2>
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
          ) : patraChalaniDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Chalani Number</label>
                  <p className="mt-1 text-sm text-gray-900">{patraChalaniDetails.chalaniNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{patraChalaniDetails.type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <p className="mt-1 text-sm text-gray-900">{patraChalaniDetails.subject}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm text-gray-900">{patraChalaniDetails.status}</p>
                </div>
              </div>

              {patraChalaniDetails.documents && patraChalaniDetails.documents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documents
                  </label>
                  <div className="space-y-2">
                    {patraChalaniDetails.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm text-gray-900">{doc.title || doc.fileName}</span>
                        <a
                          href={`${API_URL}/patra-chalani/${patraChalani.id}/download/${doc.id}`}
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

