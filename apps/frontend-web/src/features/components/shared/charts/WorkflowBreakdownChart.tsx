'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ChartWrapper from './ChartWrapper';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface WorkflowData {
  status: string;
  count: number;
}

export default function WorkflowBreakdownChart() {
  const { token } = useAuth();
  const [data, setData] = useState<WorkflowData[]>([]);
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
          const workflow = chartData.workflowBreakdown || {};
          const formatted = Object.entries(workflow).map(([status, count]) => ({
            status: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            count: count as number,
          }));
          setData(formatted);
        }
      } catch (error) {
        console.error('Error fetching workflow data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  return (
    <ChartWrapper isLoading={isLoading} isEmpty={data.length === 0} height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="status" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#4f46e5" name="Members" />
      </BarChart>
    </ChartWrapper>
  );
}
