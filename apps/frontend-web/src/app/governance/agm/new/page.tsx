'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function NewAGMPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fiscalYear: '',
    agmNumber: 1,
    bookCloseDate: '',
    scheduledDate: '',
    location: '',
    totalMembers: 0,
    presentMembers: 0,
    quorumThresholdPercent: 51.0,
    approvedDividendBonus: '',
    approvedDividendCash: '',
    status: 'PLANNED',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/governance/agm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          agmNumber: Number(formData.agmNumber),
          totalMembers: Number(formData.totalMembers),
          presentMembers: Number(formData.presentMembers),
          quorumThresholdPercent: Number(formData.quorumThresholdPercent),
          approvedDividendBonus: formData.approvedDividendBonus
            ? Number(formData.approvedDividendBonus)
            : null,
          approvedDividendCash: formData.approvedDividendCash
            ? Number(formData.approvedDividendCash)
            : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create AGM');
      }

      const data = await response.json();
      router.push(`/governance/agm/${data.agm.id}`);
    } catch (err: any) {
      console.error('Error creating AGM:', err);
      setError(err.message || 'Failed to create AGM');
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
            href="/governance/agm"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
          >
            ← Back to AGM
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New AGM</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>AGM Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fiscal Year *</label>
                  <Input
                    type="text"
                    value={formData.fiscalYear}
                    onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                    placeholder="e.g., 2080/081"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">AGM Number</label>
                  <Input
                    type="number"
                    value={formData.agmNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, agmNumber: Number(e.target.value) })
                    }
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Book Close Date</label>
                  <Input
                    type="date"
                    value={formData.bookCloseDate}
                    onChange={(e) => setFormData({ ...formData, bookCloseDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Scheduled Date *</label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <Input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Members</label>
                  <Input
                    type="number"
                    value={formData.totalMembers}
                    onChange={(e) =>
                      setFormData({ ...formData, totalMembers: Number(e.target.value) })
                    }
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Present Members</label>
                  <Input
                    type="number"
                    value={formData.presentMembers}
                    onChange={(e) =>
                      setFormData({ ...formData, presentMembers: Number(e.target.value) })
                    }
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quorum Threshold %</label>
                  <Input
                    type="number"
                    value={formData.quorumThresholdPercent}
                    onChange={(e) =>
                      setFormData({ ...formData, quorumThresholdPercent: Number(e.target.value) })
                    }
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Approved Dividend Bonus %
                  </label>
                  <Input
                    type="number"
                    value={formData.approvedDividendBonus}
                    onChange={(e) =>
                      setFormData({ ...formData, approvedDividendBonus: e.target.value })
                    }
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Approved Dividend Cash %</label>
                  <Input
                    type="number"
                    value={formData.approvedDividendCash}
                    onChange={(e) =>
                      setFormData({ ...formData, approvedDividendCash: e.target.value })
                    }
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  className="w-full border rounded-md p-2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="flex space-x-3">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create AGM'}
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
