import React from 'react';

interface SavingsTabsProps {
  activeTab: 'products' | 'accounts' | 'operations';
  onTabChange: (tab: 'products' | 'accounts' | 'operations') => void;
}

const SavingsTabs: React.FC<SavingsTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange('accounts')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'accounts'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Accounts
        </button>
        <button
          onClick={() => onTabChange('products')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'products'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => onTabChange('operations')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'operations'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Operations
        </button>
      </nav>
    </div>
  );
};

export default SavingsTabs;
