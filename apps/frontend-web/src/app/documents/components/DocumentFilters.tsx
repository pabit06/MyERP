'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Filters {
  type: 'all' | 'member' | 'official';
  documentType: string;
  category: string;
  memberId: string;
  fileType: string;
  startDate: string;
  endDate: string;
}

interface DocumentFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export default function DocumentFilters({ filters, onFiltersChange }: DocumentFiltersProps) {
  const { token } = useAuth();
  const [members, setMembers] = useState<
    Array<{ id: string; memberNumber: string; firstName: string; lastName: string }>
  >([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (filters.type === 'member' || filters.type === 'all') {
      fetchMembers();
    }
  }, [filters.type]);

  const fetchMembers = async () => {
    if (!token) return;
    setLoadingMembers(true);
    try {
      const response = await fetch(`${API_URL}/members/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      type: 'all',
      documentType: '',
      category: '',
      memberId: '',
      fileType: '',
      startDate: '',
      endDate: '',
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-800">
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Document Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
          <select
            value={filters.type}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Documents</option>
            <option value="member">Member Documents</option>
            <option value="official">Official Documents</option>
          </select>
        </div>

        {/* Document Category/Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category/Type</label>
          <input
            type="text"
            value={filters.documentType}
            onChange={(e) => updateFilter('documentType', e.target.value)}
            placeholder="e.g., id, policy, report"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Category (for official docs) */}
        {(filters.type === 'official' || filters.type === 'all') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <input
              type="text"
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              placeholder="Category name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        {/* Member Filter */}
        {(filters.type === 'member' || filters.type === 'all') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Member</label>
            <select
              value={filters.memberId}
              onChange={(e) => updateFilter('memberId', e.target.value)}
              disabled={loadingMembers}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            >
              <option value="">All Members</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.memberNumber} - {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* File Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">File Type</label>
          <select
            value={filters.fileType}
            onChange={(e) => updateFilter('fileType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Types</option>
            <option value="pdf">PDF</option>
            <option value="image">Images</option>
            <option value="word">Word Documents</option>
            <option value="excel">Excel Spreadsheets</option>
            <option value="text">Text Files</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => updateFilter('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => updateFilter('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
