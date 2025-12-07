import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface InterestOperationsProps {
  onRefresh?: () => void;
}

const InterestOperations: React.FC<InterestOperationsProps> = ({ onRefresh }) => {
  const { token } = useAuth();
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [calculationResults, setCalculationResults] = useState<any>(null);
  const [postingResults, setPostingResults] = useState<any>(null);

  const handleCalculateInterest = async () => {
    if (!token) return;

    setIsCalculating(true);
    const toastId = toast.loading('Calculating interest...');
    try {
      const response = await fetch(`${API_URL}/savings/interest/calculate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        setCalculationResults(data);
        toast.success(`Interest calculated for ${data.results?.length || 0} accounts`, {
          id: toastId,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate interest');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error calculating interest', { id: toastId });
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePostInterest = async () => {
    if (!token) return;

    setIsPosting(true);
    const toastId = toast.loading('Posting interest...');
    try {
      const response = await fetch(`${API_URL}/savings/interest/post`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        setPostingResults(data);
        toast.success(
          `Interest posted for ${data.posted?.length || 0} accounts. Total: NPR ${data.totalNetInterest?.toLocaleString('en-NP') || 0}`,
          { id: toastId, duration: 5000 }
        );
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to post interest');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error posting interest', { id: toastId });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Interest Operations</h2>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Calculate Interest</h3>
          <p className="text-sm text-gray-600 mb-4">
            Calculate daily interest for all active saving accounts based on their current balance
            and product interest rates.
          </p>
          <button
            onClick={handleCalculateInterest}
            disabled={isCalculating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Interest'}
          </button>
          {calculationResults && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                Calculated interest for <strong>{calculationResults.results?.length || 0}</strong>{' '}
                accounts
              </p>
            </div>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Post Interest</h3>
          <p className="text-sm text-gray-600 mb-4">
            Post accrued interest to saving accounts. This will calculate TDS, create accounting
            entries, and credit net interest to member accounts.
          </p>
          <button
            onClick={handlePostInterest}
            disabled={isPosting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isPosting ? 'Posting...' : 'Post Interest'}
          </button>
          {postingResults && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg space-y-2">
              <p className="text-sm text-gray-700">
                <strong>Posted:</strong> {postingResults.posted?.length || 0} accounts
              </p>
              <p className="text-sm text-gray-700">
                <strong>Total Gross Interest:</strong> NPR{' '}
                {postingResults.totalInterest?.toLocaleString('en-NP', {
                  minimumFractionDigits: 2,
                }) || 0}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Total TDS:</strong> NPR{' '}
                {postingResults.totalTDS?.toLocaleString('en-NP', {
                  minimumFractionDigits: 2,
                }) || 0}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                <strong>Total Net Interest:</strong> NPR{' '}
                {postingResults.totalNetInterest?.toLocaleString('en-NP', {
                  minimumFractionDigits: 2,
                }) || 0}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterestOperations;
