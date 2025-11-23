'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ChartWrapper from './ChartWrapper';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface GeographicData {
  state: string;
  count: number;
}

export default function GeographicChart() {
  const { token } = useAuth();
  const [data, setData] = useState<GeographicData[]>([]);
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
          const geographic = chartData.geographic || {};
          const formatted = Object.entries(geographic)
            .map(([state, count]) => ({
              state,
              count: count as number,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 states
          setData(formatted);
        }
      } catch (error) {
        console.error('Error fetching geographic data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  return (
    <ChartWrapper isLoading={isLoading} isEmpty={data.length === 0} height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="state" type="category" width={100} />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#f59e0b" name="Members" />
      </BarChart>
    </ChartWrapper>
  );
}
