'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  enabledModules: string[];
}

interface Subscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  plan: Plan;
}

export default function SubscriptionPage() {
  const { token, refreshAuth } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscription();
    fetchPlans();
  }, [token]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`${API_URL}/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      } else {
        setError('Failed to load subscription');
      }
    } catch (err) {
      setError('Error loading subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/subscription/plans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('Error loading plans:', err);
    }
  };

  const handleChangePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to change your subscription plan?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/subscription/change-plan`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        await fetchSubscription();
        await refreshAuth(); // Refresh auth to get updated modules
        alert('Subscription plan updated successfully! Please refresh the page to see changes.');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to change plan');
      }
    } catch (err) {
      alert('Error changing plan');
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {subscription && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Plan Name</p>
                <p className="text-lg font-medium text-gray-900">{subscription.plan.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Price</p>
                <p className="text-lg font-medium text-gray-900">
                  ${Number(subscription.plan.monthlyPrice).toFixed(2)}/month
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    subscription.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {subscription.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(subscription.startDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-2">Enabled Modules</p>
              {subscription.plan.enabledModules && subscription.plan.enabledModules.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(subscription.plan.enabledModules as string[]).map((module) => (
                    <span
                      key={module}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                    >
                      {module.toUpperCase()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No modules enabled</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.plan.id === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`border-2 rounded-lg p-4 ${
                    isCurrentPlan ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-2xl font-bold text-gray-900 mb-4">
                    ${Number(plan.monthlyPrice).toFixed(2)}
                    <span className="text-sm font-normal text-gray-500">/month</span>
                  </p>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Modules:</p>
                    {plan.enabledModules && plan.enabledModules.length > 0 ? (
                      <ul className="text-sm text-gray-700 space-y-1">
                        {(plan.enabledModules as string[]).map((module) => (
                          <li key={module}>• {module.toUpperCase()}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No modules</p>
                    )}
                  </div>
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleChangePlan(plan.id)}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Select Plan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
