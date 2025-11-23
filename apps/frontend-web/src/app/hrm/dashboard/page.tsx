'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function HRMDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    // Fetch HRM statistics
    // TODO: Create backend endpoint for HRM dashboard stats
    setLoading(false);
  }, [token]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">HRM Dashboard</h1>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Employees</h3>
            <p className="text-3xl font-bold">-</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Active Employees</h3>
            <p className="text-3xl font-bold">-</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Pending Leave Requests</h3>
            <p className="text-3xl font-bold">-</p>
          </div>
        </div>
      )}
    </div>
  );
}
