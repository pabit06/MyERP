'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  pendingLeaveRequests: number;
  employeesOnLeave: number;
  recentAttendance: number;
  pendingPayrollRuns: number;
  departmentDistribution: Array<{
    departmentId: string | null;
    departmentName: string;
    count: number;
  }>;
}

export default function HRMDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_URL}/hrm/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching HRM dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">HRM Dashboard</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Total Employees</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalEmployees}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Active Employees</h3>
              <p className="text-3xl font-bold text-green-600">{stats.activeEmployees}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Pending Leave Requests</h3>
              <p className="text-3xl font-bold text-orange-600">{stats.pendingLeaveRequests}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Employees on Leave</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.employeesOnLeave}</p>
            </div>
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">
                Recent Attendance (7 days)
              </h3>
              <p className="text-3xl font-bold text-indigo-600">{stats.recentAttendance}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Pending Payroll Runs</h3>
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingPayrollRuns}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Inactive Employees</h3>
              <p className="text-3xl font-bold text-red-600">{stats.inactiveEmployees}</p>
            </div>
          </div>

          {/* Department Distribution */}
          {stats.departmentDistribution.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Department Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.departmentDistribution.map((dept, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-800">{dept.departmentName}</h4>
                    <p className="text-2xl font-bold text-blue-600 mt-2">{dept.count}</p>
                    <p className="text-sm text-gray-500 mt-1">employees</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500">No data available</p>
        </div>
      )}
    </div>
  );
}
