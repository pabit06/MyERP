'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { Toaster, toast } from 'react-hot-toast';
import {
  DocumentGrid,
  DocumentList,
  UploadModal,
  DocumentFilters,
  BulkActionsBar,
  DocumentPreview,
} from '@/features/documents';

interface Document {
  id: string;
  docType: 'member' | 'official';
  fileName: string;
  filePath: string;
  fileSize?: number | null;
  mimeType?: string | null;
  documentType: string;
  description?: string | null;
  uploadedAt: string;
  uploadedBy?: string | null;
  // Member document fields
  memberId?: string;
  member?: {
    id: string;
    memberNumber: string;
    firstName: string;
    lastName: string;
  };
  // Official document fields
  title?: string;
  category?: string | null;
  version?: string | null;
  isPublic?: boolean;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

interface Statistics {
  totalDocuments: number;
  memberDocuments: number;
  officialDocuments: number;
  totalStorage: number;
  storageFormatted: string;
  recentUploads: number;
}

export default function DocumentsPage() {
  const { hasModule } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'member' | 'official',
    documentType: '',
    category: '',
    memberId: '',
    fileType: '',
    startDate: '',
    endDate: '',
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
    fetchStatistics();
    fetchDocuments();
  }, [hasModule]);

  useEffect(() => {
    if (searchQuery || Object.values(filters).some((v) => v !== '' && v !== 'all')) {
      performSearch();
    } else {
      fetchDocuments();
    }
  }, [searchQuery, filters, pagination.page]);

  const fetchStatistics = async () => {
    try {
      const data = await apiClient.get<Statistics>('/dms/statistics', {
        skipErrorToast: true,
      });
      setStatistics(data);
    } catch (err) {
      // Error handled by API client
    }
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<{
        documents: Document[];
        pagination: { total: number };
      }>(`/dms/documents/search?page=${pagination.page}&limit=${pagination.limit}`);

      setDocuments(data.documents || []);
      setFilteredDocuments(data.documents || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }));
    } catch (err) {
      setError('Error loading documents');
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append('q', searchQuery);
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.documentType) params.append('documentType', filters.documentType);
      if (filters.category) params.append('category', filters.category);
      if (filters.memberId) params.append('memberId', filters.memberId);
      if (filters.fileType) params.append('fileType', filters.fileType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const data = await apiClient.get<{ documents: Document[]; pagination?: { total: number } }>(
        `/dms/documents/search?${params.toString()}`
      );
      setDocuments(data.documents || []);
      setFilteredDocuments(data.documents || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }));
    } catch (err) {
      setError('Error searching documents');
      toast.error('Could not search documents.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    fetchDocuments();
    fetchStatistics();
    setShowUploadModal(false);
    toast.success('Document uploaded successfully!');
  };

  const handleDelete = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete "${document.fileName}"?`)) return;

    try {
      const endpoint =
        document.docType === 'member'
          ? `/dms/member-documents/${document.id}`
          : `/dms/official-documents/${document.id}`;

      await apiClient.delete(endpoint);
      toast.success('Document deleted successfully');
      fetchDocuments();
      fetchStatistics();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;

    const ids: string[] = [];
    const types: ('member' | 'official')[] = [];

    documents.forEach((doc) => {
      if (selectedDocuments.has(doc.id)) {
        ids.push(doc.id);
        types.push(doc.docType);
      }
    });

    if (!confirm(`Are you sure you want to delete ${ids.length} document(s)?`)) return;

    try {
      await apiClient.post('/dms/documents/bulk-delete', { ids, types });
      toast.success(`Deleted ${ids.length} document(s) successfully`);
      setSelectedDocuments(new Set());
      fetchDocuments();
      fetchStatistics();
    } catch (err) {
      toast.error('Failed to delete documents');
    }
  };

  const handleDownload = (document: Document) => {
    const type = document.docType;
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    window.open(`${baseURL}/dms/documents/${document.id}/download?type=${type}`, '_blank');
  };

  const handlePreview = async (document: Document) => {
    setPreviewDocument(document);
  };

  const toggleSelect = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map((d) => d.id)));
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
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="mt-1 text-sm text-gray-500">Manage and organize your documents</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Upload Document
            </button>
          </div>
        </div>

        {/* DMS Sub-modules Navigation */}
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">DMS Modules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/documents"
              className="p-4 border-2 border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">📄</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Documents</h4>
                  <p className="text-sm text-gray-600">View all documents</p>
                </div>
              </div>
            </Link>
            <Link
              href="/documents/darta-chalani"
              className="p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">📋</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Darta / Chalani (दर्ता / चलानी)</h4>
                  <p className="text-sm text-gray-600">Office ma aayeka ra pathaune patra haru</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-3">
                  <span className="text-2xl">📄</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Documents</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statistics.totalDocuments}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Member Documents</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statistics.memberDocuments}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Official Documents
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statistics.officialDocuments}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                  <span className="text-2xl">💾</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Storage Used</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statistics.storageFormatted}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${
                viewMode === 'grid'
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Grid View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${
                viewMode === 'list'
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters Sidebar */}
        {showFilters && <DocumentFilters filters={filters} onFiltersChange={setFilters} />}

        {/* Bulk Actions Bar */}
        {selectedDocuments.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedDocuments.size}
            onDelete={handleBulkDelete}
            onClearSelection={() => setSelectedDocuments(new Set())}
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Documents View */}
        {isLoading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || Object.values(filters).some((v) => v !== '' && v !== 'all')
                ? 'Try adjusting your search or filters'
                : 'Get started by uploading your first document'}
            </p>
            {!searchQuery && !Object.values(filters).some((v) => v !== '' && v !== 'all') && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Upload Document
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <DocumentGrid
                documents={filteredDocuments}
                selectedDocuments={selectedDocuments}
                onSelect={toggleSelect}
                onSelectAll={toggleSelectAll}
                onDownload={handleDownload}
                onPreview={handlePreview}
                onDelete={handleDelete}
              />
            ) : (
              <DocumentList
                documents={filteredDocuments}
                selectedDocuments={selectedDocuments}
                onSelect={toggleSelect}
                onSelectAll={toggleSelectAll}
                onDownload={handleDownload}
                onPreview={handlePreview}
                onDelete={handleDelete}
              />
            )}

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} documents
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
          </>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <UploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onSuccess={handleUploadSuccess}
          />
        )}

        {/* Preview Modal */}
        {previewDocument && (
          <DocumentPreview
            document={previewDocument}
            isOpen={!!previewDocument}
            onClose={() => setPreviewDocument(null)}
            onDownload={handleDownload}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
