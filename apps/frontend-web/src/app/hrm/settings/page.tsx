'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function HRMSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/hrm/settings/payroll`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/hrm/settings/payroll`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        alert('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">HRM Settings</h1>

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Payroll Scheme</label>
          <select
            value={settings?.scheme || 'SSF'}
            onChange={(e) => setSettings({ ...settings, scheme: e.target.value })}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="SSF">SSF (31%)</option>
            <option value="TRADITIONAL">Traditional EPF</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Festival Bonus Month (BS)</label>
          <select
            value={settings?.festivalBonusMonthBs || 6}
            onChange={(e) =>
              setSettings({ ...settings, festivalBonusMonthBs: parseInt(e.target.value) })
            }
            className="border rounded px-3 py-2 w-full"
          >
            <option value={6}>Ashwin (6)</option>
            <option value={7}>Kartik (7)</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">GL Account - Salary Expense</label>
          <input
            type="text"
            value={settings?.glSalaryExpense || ''}
            onChange={(e) => setSettings({ ...settings, glSalaryExpense: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="Chart of Accounts ID"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">GL Account - SSF Expense</label>
          <input
            type="text"
            value={settings?.glSsfExpense || ''}
            onChange={(e) => setSettings({ ...settings, glSsfExpense: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="Chart of Accounts ID"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">GL Account - TDS Payable</label>
          <input
            type="text"
            value={settings?.glTdsPayable || ''}
            onChange={(e) => setSettings({ ...settings, glTdsPayable: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="Chart of Accounts ID"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">GL Account - SSF Payable</label>
          <input
            type="text"
            value={settings?.glSsfPayable || ''}
            onChange={(e) => setSettings({ ...settings, glSsfPayable: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="Chart of Accounts ID"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">GL Account - Cash/Bank</label>
          <input
            type="text"
            value={settings?.glCashOrBank || ''}
            onChange={(e) => setSettings({ ...settings, glCashOrBank: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="Chart of Accounts ID"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
