'use client';

import { useEffect, useState, useRef } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';
import NepaliDateDisplay from '../../../components/NepaliDateDisplay';
import StatsOverview from './components/StatsOverview';
import CreateRecordModal from './components/CreateRecordModal';
import ViewRecordModal from './components/ViewRecordModal';
import StatusBadge from './components/StatusBadge';
import { Darta, PatraChalani, RecordType } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function DartaChalaniPage() {
  const { token, hasModule } = useAuth();
  const [dartas, setDartas] = useState<Darta[]>([]);
  const [patraChalanis, setPatraChalanis] = useState<PatraChalani[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'darta' | 'chalani'>('darta');
  const [selectedRecord, setSelectedRecord] = useState<{ type: 'darta' | 'chalani'; id: string } | null>(null);
  const [recordType, setRecordType] = useState<RecordType>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kitab'>('list');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    department: '',
    search: '',
    fiscalYear: '',
  });
  // Separate state for search input (immediate update, no API call)
  const [searchInput, setSearchInput] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  // Separate pagination for "All" view
  const [dartaPagination, setDartaPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [chalaniPagination, setChalaniPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // Debounce search input - update filters.search after 500ms of no typing
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout to update filter after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
      // Reset pagination when search changes
      setPagination((prev) => ({ ...prev, page: 1 }));
      setDartaPagination((prev) => ({ ...prev, page: 1 }));
      setChalaniPagination((prev) => ({ ...prev, page: 1 }));
    }, 500); // 500ms debounce delay

    // Cleanup timeout on unmount or when searchInput changes
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  // Fetch data when filters change (including debounced search)
  useEffect(() => {
    if (!hasModule('dms')) {
      setError('DMS module is not enabled for your subscription');
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [token, hasModule, filters, pagination.page, dartaPagination.page, chalaniPagination.page, recordType]);

  const fetchData = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [];

      // For "all" view, use separate pagination; otherwise use main pagination
      const dartaPage = recordType === 'all' ? dartaPagination.page : pagination.page;
      const chalaniPage = recordType === 'all' ? chalaniPagination.page : pagination.page;
      const limit = recordType === 'all' ? dartaPagination.limit : pagination.limit;

      // Map status for Darta endpoint
      const mapStatusForDarta = (status: string): string | null => {
        const statusMap: Record<string, string> = {
          'ACTIVE': 'ACTIVE',
          'PROCESSING': 'PROCESSING',
          'COMPLETED': 'COMPLETED',
          'ARCHIVED': 'ARCHIVED',
          'CANCELLED': 'CANCELLED',
          // Map Chalani statuses that might be selected in "all" view
          'PENDING': 'ACTIVE',        // Chalani PENDING -> Darta ACTIVE
          'IN_PROGRESS': 'PROCESSING', // Chalani IN_PROGRESS -> Darta PROCESSING
          'DRAFT': 'ACTIVE',          // Chalani DRAFT -> Darta ACTIVE
          'APPROVED': 'PROCESSING',   // Chalani APPROVED -> Darta PROCESSING
          'SENT': 'COMPLETED',        // Chalani SENT -> Darta COMPLETED
        };
        return statusMap[status.toUpperCase()] || null;
      };

      if (recordType === 'all' || recordType === 'darta') {
        const dartaParams = new URLSearchParams({
          page: dartaPage.toString(),
          limit: limit.toString(),
        });
        if (filters.status) {
          const mappedStatus = mapStatusForDarta(filters.status);
          if (mappedStatus) {
            dartaParams.append('status', mappedStatus);
          }
        }
        if (filters.category) dartaParams.append('category', filters.category);
        if (filters.search) dartaParams.append('search', filters.search);
        if (filters.fiscalYear) dartaParams.append('fiscalYear', filters.fiscalYear);

        promises.push(
          fetch(`${API_URL}/darta?${dartaParams.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(async (res) => {
            if (!res.ok) {
              const error = await res.json().catch(() => ({ error: 'Failed to fetch darta records' }));
              return { error: error.message || error.error || 'Failed to fetch darta records', dartas: [], pagination: { total: 0 } };
            }
            return res.json();
          })
        );
      } else {
        promises.push(Promise.resolve({ dartas: [], pagination: { total: 0 } }));
      }

      // Map status for Chalani endpoint
      const mapStatusForChalani = (status: string): string | null => {
        const statusMap: Record<string, string> = {
          'DRAFT': 'DRAFT',
          'PENDING': 'PENDING',
          'IN_PROGRESS': 'IN_PROGRESS',
          'APPROVED': 'APPROVED',
          'SENT': 'SENT',
          'COMPLETED': 'COMPLETED',
          'ARCHIVED': 'ARCHIVED',
          'CANCELLED': 'CANCELLED',
          // Map Darta statuses that might be selected in "all" view
          'ACTIVE': 'PENDING',        // Darta ACTIVE -> Chalani PENDING
          'PROCESSING': 'IN_PROGRESS', // Darta PROCESSING -> Chalani IN_PROGRESS
        };
        return statusMap[status.toUpperCase()] || null;
      };

      if (recordType === 'all' || recordType === 'chalani') {
        const chalaniParams = new URLSearchParams({
          page: chalaniPage.toString(),
          limit: limit.toString(),
        });
        if (filters.status) {
          const mappedStatus = mapStatusForChalani(filters.status);
          if (mappedStatus) {
            chalaniParams.append('status', mappedStatus);
          }
        }
        if (filters.category) chalaniParams.append('category', filters.category);
        if (filters.search) chalaniParams.append('search', filters.search);
        if (filters.fiscalYear) chalaniParams.append('fiscalYear', filters.fiscalYear);

        promises.push(
          fetch(`${API_URL}/patra-chalani?${chalaniParams.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(async (res) => {
            if (!res.ok) {
              const error = await res.json().catch(() => ({ error: 'Failed to fetch chalani records' }));
              return { error: error.message || error.error || 'Failed to fetch chalani records', patraChalanis: [], pagination: { total: 0 } };
            }
            return res.json();
          })
        );
      } else {
        promises.push(Promise.resolve({ patraChalanis: [], pagination: { total: 0 } }));
      }

      const [dartaResponse, chalaniResponse] = await Promise.all(promises);

      // Handle API errors
      if (!dartaResponse || dartaResponse.error) {
        throw new Error(dartaResponse?.error || 'Failed to fetch darta records');
      }
      if (!chalaniResponse || chalaniResponse.error) {
        throw new Error(chalaniResponse?.error || 'Failed to fetch chalani records');
      }

      setDartas(dartaResponse.dartas || []);
      setPatraChalanis(chalaniResponse.patraChalanis || []);

      const totalDartas = dartaResponse.pagination?.total || 0;
      const totalChalanis = chalaniResponse.pagination?.total || 0;

      if (recordType === 'all') {
        // Update separate pagination for "all" view
        setDartaPagination((prev) => ({ ...prev, total: totalDartas }));
        setChalaniPagination((prev) => ({ ...prev, total: totalChalanis }));
      } else {
        // Update main pagination for single-type views
        setPagination((prev) => ({
          ...prev,
          total: recordType === 'darta' ? totalDartas : totalChalanis,
        }));
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Error loading records';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching records:', err);
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
        const error = await response.json().catch(() => ({ error: 'Failed to delete record' }));
        throw new Error(error.message || error.error || 'Failed to delete record');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to delete record';
      toast.error(errorMessage);
      console.error('Error deleting record:', err);
    }
  };

  const _handleStatusUpdate = async (type: 'darta' | 'chalani', id: string, newStatus: string) => {
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
        const error = await response.json().catch(() => ({ error: 'Failed to update status' }));
        throw new Error(error.message || error.error || 'Failed to update status');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to update status';
      toast.error(errorMessage);
      console.error('Error updating status:', err);
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

  // Calculate stats from pagination totals and current records
  const getStats = () => {
    let dartaCount = 0;
    let chalaniCount = 0;
    
    if (recordType === 'all') {
      dartaCount = dartaPagination.total;
      chalaniCount = chalaniPagination.total;
    } else if (recordType === 'darta') {
      dartaCount = pagination.total;
    } else if (recordType === 'chalani') {
      chalaniCount = pagination.total;
    }
    
    // Pending count from currently loaded records (approximation)
    // For Darta: ACTIVE or PROCESSING are considered pending
    // For Chalani: PENDING, DRAFT, or IN_PROGRESS are considered pending
    const pendingCount = allRecords.filter(r => {
      const status = r.status?.toUpperCase();
      if (r.recordType === 'darta') {
        return status === 'ACTIVE' || status === 'PROCESSING';
      } else {
        return status === 'PENDING' || status === 'DRAFT' || status === 'IN_PROGRESS';
      }
    }).length;
    
    return { dartaCount, chalaniCount, pendingCount };
  };

  const stats = getStats();

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
      <div className="space-y-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
             <div className="flex items-center gap-2 mb-2">
              <Link href="/documents" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Documents
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Digital Darta / Chalani</h1>
            <p className="mt-2 text-sm text-gray-500 max-w-2xl">
              Manage all incoming (Darta) and outgoing (Chalani) official correspondence in one secure digital register.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setCreateModalTab('darta'); // Default, but will show selection first
                setShowCreateModal(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold text-base transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add New Entry
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <StatsOverview 
          dartaCount={stats.dartaCount} 
          chalaniCount={stats.chalaniCount} 
          pendingCount={stats.pendingCount} 
        />

        {/* Main Content Area */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col lg:flex-row gap-4 justify-between items-center">
             {/* Tabs */}
             <div className="bg-gray-200/60 p-1 rounded-lg flex gap-1 w-full lg:w-auto">
                {['all', 'darta', 'chalani'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setRecordType(type as RecordType);
                      setPagination(prev => ({...prev, page: 1}));
                      setDartaPagination(prev => ({...prev, page: 1}));
                      setChalaniPagination(prev => ({...prev, page: 1}));
                      // Clear search when switching tabs
                      setSearchInput('');
                      setFilters(prev => ({...prev, search: ''}));
                    }}
                    className={`flex-1 lg:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${
                      recordType === type
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    } capitalize`}
                  >
                    {type === 'all' ? 'All Records' : type}
                  </button>
                ))}
             </div>

             {/* Filters */}
             <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <input
                    type="text"
                    placeholder="Search Ref No, Subject..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchInput && searchInput !== filters.search && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    </div>
                  )}
                  {searchInput && searchInput === filters.search && (
                    <button
                      onClick={() => {
                        setSearchInput('');
                        setFilters(prev => ({ ...prev, search: '' }));
                      }}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      title="Clear search"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <select
                  value={filters.fiscalYear}
                  onChange={(e) => {
                    setFilters({ ...filters, fiscalYear: e.target.value });
                    setPagination(prev => ({...prev, page: 1}));
                    setDartaPagination(prev => ({...prev, page: 1}));
                    setChalaniPagination(prev => ({...prev, page: 1}));
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Fiscal Years</option>
                  <option value={getFiscalYear()}>{getFiscalYear()}</option>
                  <option value="081/082">081/082</option>
                  <option value="080/081">080/081</option>
                  <option value="079/080">079/080</option>
                </select>
                
                <select
                  value={filters.category}
                  onChange={(e) => {
                    setFilters({ ...filters, category: e.target.value });
                    setPagination(prev => ({...prev, page: 1}));
                    setDartaPagination(prev => ({...prev, page: 1}));
                    setChalaniPagination(prev => ({...prev, page: 1}));
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Categories</option>
                  <option value="GOVERNMENT_NOTICE">Government Notice</option>
                  <option value="LOAN_REQUEST">Loan Request</option>
                  <option value="MEMBER_APPLICATION">Member Application</option>
                  <option value="COMPLAINT">Complaint</option>
                  <option value="LEGAL_DOCUMENT">Legal Document</option>
                  <option value="FINANCIAL_REPORT">Financial Report</option>
                  <option value="MEETING_MINUTE">Meeting Minute</option>
                  <option value="OFFICIAL_CORRESPONDENCE">Official Correspondence</option>
                  <option value="MEMBER_COMMUNICATION">Member Communication</option>
                  <option value="GOVERNMENT_REPLY">Government Reply</option>
                  <option value="INTERNAL_MEMO">Internal Memo</option>
                  <option value="OTHER">Other</option>
                </select>
                
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    setPagination(prev => ({...prev, page: 1}));
                    setDartaPagination(prev => ({...prev, page: 1}));
                    setChalaniPagination(prev => ({...prev, page: 1}));
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Status</option>
                  {/* Darta Statuses */}
                  {recordType === 'darta' || recordType === 'all' ? (
                    <>
                      <option value="ACTIVE">Active</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                      <option value="CANCELLED">Cancelled</option>
                    </>
                  ) : null}
                  {/* Chalani Statuses */}
                  {recordType === 'chalani' || recordType === 'all' ? (
                    <>
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="APPROVED">Approved</option>
                      <option value="SENT">Sent</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                      <option value="CANCELLED">Cancelled</option>
                    </>
                  ) : null}
                </select>

                <div className="hidden sm:flex border-l pl-3 ml-1 gap-1">
                   <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md ${viewMode === 'list' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="List View"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                   </button>
                   <button 
                    onClick={() => setViewMode('kitab')}
                    className={`p-2 rounded-md ${viewMode === 'kitab' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="Kitab (Register) View"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7-8v8m14-8v8M5 21l7-7 7 7" /></svg>
                   </button>
                </div>
             </div>
          </div>

          {/* Records List */}
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading digital register...</p>
            </div>
          ) : recordType === 'all' ? (
            // Separate tables for "All" view to avoid pagination paradox
            <div className="space-y-8 p-6">
              {/* Darta Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    दर्ता (Darta) - Incoming Documents
                  </h3>
                  <span className="text-sm text-gray-500">
                    {dartas.length} of {dartaPagination.total} entries
                  </span>
                </div>
                {dartas.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">No Darta records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y divide-gray-200 ${viewMode === 'kitab' ? 'border-collapse border border-gray-300' : ''}`}>
                      <thead className={viewMode === 'kitab' ? 'bg-gray-100' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Darta No.
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Date
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Subject / Title
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Sender
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Status
                          </th>
                          <th className={`px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`bg-white divide-y divide-gray-200 ${viewMode === 'kitab' ? 'text-sm' : ''}`}>
                        {dartas.map((record) => (
                          <tr key={record.id} className={`hover:bg-gray-50 transition-colors group ${viewMode === 'kitab' ? 'border-b border-gray-300' : ''}`}>
                            <td className={`px-6 py-4 whitespace-nowrap ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white mr-3">
                                  D
                                </div>
                                <div className="text-sm font-bold text-gray-900">{record.dartaNumber}</div>
                              </div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <NepaliDateDisplay date={record.createdAt} showBs={true} />
                            </td>
                            <td className={`px-6 py-4 ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <div className="text-sm font-medium text-gray-900">{record.title || record.subject || '-'}</div>
                            </td>
                            <td className={`px-6 py-4 ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <div className="text-sm text-gray-600">{(record as any).senderName || '-'}</div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <StatusBadge status={record.status} />
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setSelectedRecord({ type: 'darta', id: record.id })} className="text-indigo-600 hover:text-indigo-900">View</button>
                                <button onClick={() => handleDelete('darta', record.id, record.title)} className="text-red-600 hover:text-red-900">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Darta Pagination */}
                {dartaPagination.total > dartaPagination.limit && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                      Showing {(dartaPagination.page - 1) * dartaPagination.limit + 1} to {Math.min(dartaPagination.page * dartaPagination.limit, dartaPagination.total)} of {dartaPagination.total}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDartaPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={dartaPagination.page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setDartaPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={dartaPagination.page * dartaPagination.limit >= dartaPagination.total}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Chalani Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    चलानी (Chalani) - Outgoing Documents
                  </h3>
                  <span className="text-sm text-gray-500">
                    {patraChalanis.length} of {chalaniPagination.total} entries
                  </span>
                </div>
                {patraChalanis.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">No Chalani records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y divide-gray-200 ${viewMode === 'kitab' ? 'border-collapse border border-gray-300' : ''}`}>
                      <thead className={viewMode === 'kitab' ? 'bg-gray-100' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Chalani No.
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Date
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Subject
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Receiver
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Status
                          </th>
                          <th className={`px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`bg-white divide-y divide-gray-200 ${viewMode === 'kitab' ? 'text-sm' : ''}`}>
                        {patraChalanis.map((record) => (
                          <tr key={record.id} className={`hover:bg-gray-50 transition-colors group ${viewMode === 'kitab' ? 'border-b border-gray-300' : ''}`}>
                            <td className={`px-6 py-4 whitespace-nowrap ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white mr-3">
                                  C
                                </div>
                                <div className="text-sm font-bold text-gray-900">{record.chalaniNumber}</div>
                              </div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <NepaliDateDisplay date={record.date} showBs={true} />
                            </td>
                            <td className={`px-6 py-4 ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <div className="text-sm font-medium text-gray-900">{record.subject}</div>
                            </td>
                            <td className={`px-6 py-4 ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <div className="text-sm text-gray-600">{(record as PatraChalani).receiverName || '-'}</div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <StatusBadge status={record.status} />
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                              <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setSelectedRecord({ type: 'chalani', id: record.id })} className="text-indigo-600 hover:text-indigo-900">View</button>
                                <button onClick={() => handleDelete('chalani', record.id, record.subject)} className="text-red-600 hover:text-red-900">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Chalani Pagination */}
                {chalaniPagination.total > chalaniPagination.limit && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                      Showing {(chalaniPagination.page - 1) * chalaniPagination.limit + 1} to {Math.min(chalaniPagination.page * chalaniPagination.limit, chalaniPagination.total)} of {chalaniPagination.total}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setChalaniPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={chalaniPagination.page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setChalaniPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={chalaniPagination.page * chalaniPagination.limit >= chalaniPagination.total}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : allRecords.length === 0 ? (
            <div className="p-12 text-center bg-gray-50/50">
              <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                 <span className="text-4xl">📭</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No records found</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                No documents match your current filters. Try adjusting your search or create a new record.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setCreateModalTab('darta');
                    setShowCreateModal(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  Add New Entry
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y divide-gray-200 ${viewMode === 'kitab' ? 'border-collapse border border-gray-300' : ''}`}>
                <thead className={viewMode === 'kitab' ? 'bg-gray-100' : 'bg-gray-50'}>
                  <tr>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                      Register No.
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                      Date
                    </th>
                     <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                      Subject / Title
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                      {recordType === 'darta' ? 'Sender' : recordType === 'chalani' ? 'Receiver' : 'Party'}
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                      Category
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                      Status
                    </th>
                    <th scope="col" className={`px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${viewMode === 'kitab' ? 'border border-gray-300' : ''}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`bg-white divide-y divide-gray-200 ${viewMode === 'kitab' ? 'text-sm' : ''}`}>
                  {allRecords.map((record) => (
                    <tr key={record.id} className={`hover:bg-gray-50 transition-colors group ${viewMode === 'kitab' ? 'border-b border-gray-300' : ''}`}>
                      <td className={`px-6 py-4 whitespace-nowrap ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                         <div className="flex items-center">
                          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 
                            ${record.recordType === 'darta' ? 'bg-green-500 shadow-green-200' : 'bg-blue-500 shadow-blue-200'} shadow-sm`}>
                            {record.recordType === 'darta' ? 'D' : 'C'}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {record.displayNumber}
                            </div>
                            {record.recordType === 'chalani' && (record as PatraChalani).patraNumber && (
                              <div className="text-xs text-gray-500">
                                Ref: {(record as PatraChalani).patraNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                        <div className="text-sm text-gray-900">
                           <NepaliDateDisplay
                            date={record.recordType === 'darta' ? record.createdAt : (record as PatraChalani).date}
                            showBs={true}
                          />
                        </div>
                         <div className="text-xs text-gray-500">{getFiscalYear()}</div>
                      </td>
                       <td className={`px-6 py-4 ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                        <div className="text-sm font-medium text-gray-900 line-clamp-2">
                          {record.recordType === 'darta'
                            ? (record as Darta).title || (record as Darta).subject || '-'
                            : (record as PatraChalani).subject}
                        </div>
                      </td>
                       <td className={`px-6 py-4 ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                         <div className="text-sm text-gray-600">
                          {record.recordType === 'darta' ? (
                             (record as Darta).senderName || '-'
                          ) : (
                            <>
                              {(record as PatraChalani).type === 'INCOMING' ? (
                                <span className="text-gray-900 font-medium">From: {(record as PatraChalani).senderName || '-'}</span>
                              ) : (
                                <span className="text-gray-900 font-medium">To: {(record as PatraChalani).receiverName || '-'}</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                           {record.category || (record as any).category || 'General'}
                         </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                         <StatusBadge status={record.status} />
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${viewMode === 'kitab' ? 'border border-gray-300 py-2' : ''}`}>
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                            onClick={() => setSelectedRecord({ type: record.recordType, id: record.id })}
                            className="text-indigo-600 hover:text-indigo-900" 
                            title="View Details"
                           >
                             View
                           </button>
                           <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this record?')) {
                                    handleDelete(
                                      record.recordType,
                                      record.id,
                                      record.recordType === 'darta' ? (record as Darta).title : (record as PatraChalani).subject
                                    );
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                           >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </div>
                        {/* Mobile fallback for actions */}
                        <div className="sm:hidden flex justify-end">
                           <button onClick={() => setSelectedRecord({ type: record.recordType, id: record.id })} className="text-indigo-600 text-xs">View</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination - Only for single-type views (not "all") */}
          {recordType !== 'all' && pagination.total > pagination.limit && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div className="flex gap-2">
                   <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page * pagination.limit >= pagination.total}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <CreateRecordModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchData();
            setShowCreateModal(false);
          }}
          initialTab={createModalTab}
        />

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
