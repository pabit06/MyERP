'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ProtectedRoute,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
} from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AGM {
  id: string;
  fiscalYear: string;
  agmNumber: number;
  scheduledDate: string;
  bookCloseDate?: string;
  location?: string;
  totalMembers: number;
  presentMembers: number;
  quorumThresholdPercent: number;
  approvedDividendBonus?: number;
  approvedDividendCash?: number;
  status: string;
  notes?: string;
  minutesFileUrl?: string;
}

export default function AGMDetailPage() {
  const params = useParams();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [agm, setAgm] = useState<AGM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<AGM>>({});

  const agmId = params.id as string;

  useEffect(() => {
    if (!authLoading && isAuthenticated && token && agmId) {
      fetchAGM();
    }
  }, [authLoading, isAuthenticated, token, agmId]);

  const fetchAGM = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/governance/agm/${agmId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AGM');
      }

      const data = await response.json();
      setAgm(data.agm);
      setFormData(data.agm);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching AGM:', err);
      setError(err.message || 'Failed to load AGM');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/governance/agm/${agmId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update AGM');
      }

      await fetchAGM();
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating AGM:', err);
      setError(err.message || 'Failed to update AGM');
    } finally {
      setLoading(false);
    }
  };

  const calculateQuorum = () => {
    if (!agm || agm.totalMembers === 0) return { met: false, percentage: 0 };
    const percentage = (agm.presentMembers / agm.totalMembers) * 100;
    return { met: percentage >= agm.quorumThresholdPercent, percentage };
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading AGM...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !agm) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="p-6">
          <Link
            href="/governance/agm"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-4 inline-block"
          >
            ← Back to AGM
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error || 'AGM not found'}</p>
            <Button onClick={fetchAGM} className="mt-4" variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const quorum = calculateQuorum();

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Link
              href="/governance/agm"
              className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
            >
              ← Back to AGM
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {agm.agmNumber}th AGM - Fiscal Year {agm.fiscalYear}
            </h1>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              Edit
            </Button>
          )}
        </div>

        {/* Quorum Status Indicator */}
        <Card className={quorum.met ? 'border-green-500' : 'border-red-500'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Quorum Status</h3>
                <p className="text-sm text-gray-600">
                  {agm.presentMembers} / {agm.totalMembers} members present (
                  {quorum.percentage.toFixed(1)}%)
                </p>
              </div>
              <span
                className={`px-4 py-2 rounded-lg text-lg font-bold ${
                  quorum.met ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {quorum.met ? '✓ Quorum Met' : '✗ Quorum Not Met'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Threshold: {agm.quorumThresholdPercent}%</p>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>AGM Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fiscal Year</label>
                    <Input
                      value={formData.fiscalYear || ''}
                      onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">AGM Number</label>
                    <Input
                      type="number"
                      value={formData.agmNumber || 0}
                      onChange={(e) =>
                        setFormData({ ...formData, agmNumber: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Scheduled Date</label>
                    <Input
                      type="datetime-local"
                      value={
                        formData.scheduledDate
                          ? new Date(formData.scheduledDate).toISOString().slice(0, 16)
                          : ''
                      }
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Members</label>
                    <Input
                      type="number"
                      value={formData.totalMembers || 0}
                      onChange={(e) =>
                        setFormData({ ...formData, totalMembers: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Present Members</label>
                    <Input
                      type="number"
                      value={formData.presentMembers || 0}
                      onChange={(e) =>
                        setFormData({ ...formData, presentMembers: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Quorum Threshold %</label>
                    <Input
                      type="number"
                      value={formData.quorumThresholdPercent || 51.0}
                      onChange={(e) =>
                        setFormData({ ...formData, quorumThresholdPercent: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button onClick={handleUpdate} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData(agm);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Fiscal Year</p>
                    <p className="font-semibold">{agm.fiscalYear}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">AGM Number</p>
                    <p className="font-semibold">{agm.agmNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Scheduled Date</p>
                    <p className="font-semibold">{new Date(agm.scheduledDate).toLocaleString()}</p>
                  </div>
                  {agm.bookCloseDate && (
                    <div>
                      <p className="text-sm text-gray-500">Book Close Date</p>
                      <p className="font-semibold">
                        {new Date(agm.bookCloseDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Total Members</p>
                    <p className="font-semibold">{agm.totalMembers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Present Members</p>
                    <p className="font-semibold">{agm.presentMembers}</p>
                  </div>
                </div>
                {agm.approvedDividendBonus !== null && agm.approvedDividendBonus !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500">Approved Dividend Bonus</p>
                    <p className="font-semibold">{agm.approvedDividendBonus}%</p>
                  </div>
                )}
                {agm.approvedDividendCash !== null && agm.approvedDividendCash !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500">Approved Dividend Cash</p>
                    <p className="font-semibold">{agm.approvedDividendCash}%</p>
                  </div>
                )}
                {agm.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="font-semibold">{agm.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
