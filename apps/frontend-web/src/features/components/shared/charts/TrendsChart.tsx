'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import ChartWrapper from './ChartWrapper';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface RegistrationTrend {
  date: string;
  count: number;
}

interface WorkflowTrend {
  status: string;
  avgDays: number;
  count: number;
}

export default function TrendsChart() {
  const { token } = useAuth();
  const [registrationData, setRegistrationData] = useState<RegistrationTrend[]>([]);
  const [workflowData, setWorkflowData] = useState<WorkflowTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/members/charts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const chartData = await response.json();
          setRegistrationData(chartData.registrationTrends || []);

          const workflow = chartData.workflowTrends || [];
          setWorkflowData(
            workflow.map((w: WorkflowTrend) => ({
              ...w,
              status: w.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching trends data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Registration Trends (Last 30 Days)</h3>
        <ChartWrapper isLoading={isLoading} isEmpty={registrationData.length === 0} height={300}>
          <LineChart data={registrationData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#4f46e5"
              strokeWidth={2}
              name="New Registrations"
            />
          </LineChart>
        </ChartWrapper>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Workflow Trends (Average Days in Status)</h3>
        <ChartWrapper isLoading={isLoading} isEmpty={workflowData.length === 0} height={300}>
          <BarChart data={workflowData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="status"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgDays" fill="#10b981" name="Average Days" />
            <Bar dataKey="count" fill="#f59e0b" name="Members Count" />
          </BarChart>
        </ChartWrapper>
      </div>
    </div>
  );
}
