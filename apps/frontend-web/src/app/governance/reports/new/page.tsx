'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';

const NEPALI_MONTHS = [
  'Baisakh',
  'Jestha',
  'Ashad',
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

export default function NewReportPage() {
  const router = useRouter();
  const { token, hasModule, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fiscalYear: '',
    month: '',
    title: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.fiscalYear || !formData.month) {
      setError('Fiscal year and month are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/governance/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fiscalYear: formData.fiscalYear,
          month: formData.month,
          title: formData.title || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create report');
      }

      const data = await response.json();
      router.push(`/governance/reports/${data.report.id}`);
    } catch (error: any) {
      console.error('Error creating report:', error);
      setError(error.message || 'Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please login to access this page.</p>
        </div>
      </div>
    );
  }

  if (!hasModule('governance')) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">
              Governance module is not enabled for your subscription plan.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/governance/reports"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
          >
            ← Back to Reports
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New Monthly Report</h1>
          <p className="mt-1 text-sm text-gray-500">व्यवस्थापकको प्रतिवेदन बनाउनुहोस्</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fiscal Year (आर्थिक वर्ष) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.fiscalYear}
              onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
              placeholder="e.g., 2081"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month (महिना) <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Month</option>
              {NEPALI_MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (शीर्षक) (Optional)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., 2081 Shrawan - Monthly Progress Report"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              If left empty, title will be auto-generated as "{formData.fiscalYear} {formData.month}{' '}
              - Monthly Progress Report"
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Report'}
            </button>
            <Link
              href="/governance/reports"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
