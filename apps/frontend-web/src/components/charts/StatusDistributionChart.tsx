'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import ChartWrapper from './ChartWrapper';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface StatusData {
  name: string;
  value: number;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

export default function StatusDistributionChart() {
  const { token } = useAuth();
  const [data, setData] = useState<StatusData[]>([]);
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
          const statusDist = chartData.statusDistribution || {};
          setData([
            { name: 'Active', value: statusDist.active || 0 },
            { name: 'Inactive', value: statusDist.inactive || 0 },
            { name: 'Pending KYM', value: statusDist.pendingKYC || 0 },
          ]);
        }
      } catch (error) {
        console.error('Error fetching status data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  return (
    <ChartWrapper isLoading={isLoading} isEmpty={data.every((d) => d.value === 0)} height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartWrapper>
  );
}
