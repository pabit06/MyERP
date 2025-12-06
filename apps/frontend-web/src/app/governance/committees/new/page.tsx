'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const COMMITTEE_TYPES = [
  { value: 'BOD', label: 'Board of Directors (सञ्चालक समिति)' },
  { value: 'ACCOUNT', label: 'Account Committee (लेखा समिति)' },
  { value: 'LOAN', label: 'Loan Committee (ऋण उप-समिति)' },
  { value: 'EDUCATION', label: 'Education Committee (शिक्षा उप-समिति)' },
  { value: 'OTHER', label: 'Other Committee (अन्य समिति)' },
];

export default function NewCommitteePage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    nameNepali: '',
    description: '',
    type: 'OTHER',
    isStatutory: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.name.trim()) {
      setError('Committee name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/governance/committees`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create committee');
      }

      const data = await response.json();
      router.push(`/governance/committees/${data.committee.id}`);
    } catch (err: any) {
      console.error('Error creating committee:', err);
      setError(err.message || 'Failed to create committee');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="p-6 space-y-6">
        <div>
          <Link
            href="/governance/committees"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
          >
            ← Back to Committees
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New Committee</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Committee Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name (English) *</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Board of Directors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name (Nepali)</label>
                <Input
                  type="text"
                  value={formData.nameNepali}
                  onChange={(e) => setFormData({ ...formData, nameNepali: e.target.value })}
                  placeholder="e.g., सञ्चालक समिति"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded-md p-2"
                  required
                >
                  {COMMITTEE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full border rounded-md p-2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Committee description..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isStatutory"
                  checked={formData.isStatutory}
                  onChange={(e) => setFormData({ ...formData, isStatutory: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isStatutory" className="text-sm font-medium">
                  Statutory Committee
                </label>
              </div>
              <div className="flex space-x-3">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Committee'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
