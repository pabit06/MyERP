'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import ChartWrapper from './ChartWrapper';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const GENDER_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6'];

export default function DemographicChart() {
  const { token } = useAuth();
  const [genderData, setGenderData] = useState<{ name: string; value: number }[]>([]);
  const [ageData, setAgeData] = useState<{ age: string; count: number }[]>([]);
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
          const demographics = chartData.demographics || {};

          // Format gender data
          const gender = demographics.gender || {};
          setGenderData(
            Object.entries(gender).map(([name, value]) => ({
              name: name.charAt(0).toUpperCase() + name.slice(1),
              value: value as number,
            }))
          );

          // Format age data
          const ageGroups = demographics.ageGroups || {};
          setAgeData(
            Object.entries(ageGroups).map(([age, count]) => ({
              age,
              count: count as number,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching demographic data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Gender Distribution</h3>
        <ChartWrapper isLoading={isLoading} isEmpty={genderData.length === 0} height={300}>
          <PieChart>
            <Pie
              data={genderData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {genderData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ChartWrapper>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Age Distribution</h3>
        <ChartWrapper isLoading={isLoading} isEmpty={ageData.length === 0} height={300}>
          <BarChart data={ageData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="age" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#10b981" name="Members" />
          </BarChart>
        </ChartWrapper>
      </div>
    </div>
  );
}
