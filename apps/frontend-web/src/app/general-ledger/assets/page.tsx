'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import {
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Search,
  ChevronsDown,
  ChevronsUp,
  Eye,
  Plus,
  RefreshCw,
  DollarSign,
  ExternalLink,
  Edit2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  isGroup: boolean;
  isActive?: boolean;
  parentId: string | null;
  nfrsMap: string | null;
  balance?: number;
  parent?: {
    id: string;
    code: string;
    name: string;
  };
  children?: Account[];
  _count?: {
    ledgerEntries: number;
  };
}

interface AccountTreeNode extends Account {
  children?: AccountTreeNode[];
  expanded?: boolean;
  balance?: number;
  calculatedBalance?: number; // Sum of all children balances
}

export default function AssetsPage() {
  const { token, hasModule } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tree, setTree] = useState<AccountTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [isSeeding, setIsSeeding] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [hasOldAccounts, setHasOldAccounts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountForm, setAccountForm] = useState({
    name: '',
    code: '',
    parentId: '',
    nfrsMap: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState<{
    totalAccounts: number;
    totalBalance: number;
    groupAccounts: number;
    ledgerAccounts: number;
  } | null>(null);

  const fetchAccountBalances = useCallback(async (accountsList: Account[]) => {
    if (!token) return;

    try {
      // Balances are now included in the accounts response from the backend
      const balanceMap: Record<string, number> = {};
      accountsList.forEach((account: any) => {
        if (account.balance !== undefined) {
          balanceMap[account.id] = account.balance;
        }
      });
      setAccountBalances(balanceMap);
    } catch (err) {
      console.error('Error processing balances:', err);
    }
  }, [token]);

  const fetchAccounts = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/accounting/accounts?type=asset`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
        // Auto-expand all nodes by default to show all ledger heads
        const allIds = data.map((acc: Account) => acc.id);
        setExpandedNodes(new Set(allIds));
        setAllExpanded(true);
        // Fetch balances
        await fetchAccountBalances(data);

        // Check if old accounts exist (1001, 3001, 4001)
        const oldAccountCodes = ['1001', '3001', '4001'];
        const hasOld = data.some(
          (acc: Account) => oldAccountCodes.includes(acc.code) && acc.isActive
        );
        setHasOldAccounts(hasOld);
      } else {
        setError('Error loading accounts');
      }
    } catch (err) {
      setError('Error loading accounts');
    } finally {
      setIsLoading(false);
    }
  }, [token, fetchAccountBalances]);

  useEffect(() => {
    if (!hasModule('cbs')) {
      setError('CBS module is not enabled for your subscription');
      setIsLoading(false);
      return;
    }
    fetchAccounts();
  }, [token, hasModule, fetchAccounts]);

  const handleSeedAccounts = async () => {
    if (!token) return;

    setIsSeeding(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/accounting/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        // Refresh accounts after seeding
        await fetchAccounts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to seed accounts');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to seed accounts');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/accounting/accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: accountForm.name,
          code: accountForm.code || undefined,
          type: 'asset',
          isGroup: false,
          parentId: accountForm.parentId || null,
          nfrsMap: accountForm.nfrsMap || null,
          autoGenerateCode: !accountForm.code,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setAccountForm({ name: '', code: '', parentId: '', nfrsMap: '' });
        await fetchAccounts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create account');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingAccount) return;

    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/accounting/accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: accountForm.name,
          nfrsMap: accountForm.nfrsMap || null,
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingAccount(null);
        setAccountForm({ name: '', code: '', parentId: '', nfrsMap: '' });
        await fetchAccounts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update account');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setAccountForm({
      name: account.name,
      code: account.code,
      parentId: account.parentId || '',
      nfrsMap: account.nfrsMap || '',
    });
    setShowEditModal(true);
  };

  const handleMigrateAccounts = async () => {
    if (!token) return;

    setIsMigrating(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/accounting/migrate-old-accounts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh accounts after migration
        await fetchAccounts();
        // Hide migrate button after successful migration
        setHasOldAccounts(false);
        alert(
          'Accounts migrated successfully! Old accounts have been consolidated into NFRS format.'
        );
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to migrate accounts');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to migrate accounts');
    } finally {
      setIsMigrating(false);
    }
  };

  const buildTree = useCallback(
    (accountsList: Account[], expanded: Set<string>, balances: Record<string, number>) => {
      // Filter to only include asset accounts (double-check on frontend)
      const assetAccounts = accountsList.filter((acc) => acc.type.toLowerCase() === 'asset');

      const accountMap = new Map<string, AccountTreeNode>();
      const rootNodes: AccountTreeNode[] = [];

      // First pass: create all nodes (only for asset accounts)
      assetAccounts.forEach((account) => {
        accountMap.set(account.id, {
          ...account,
          children: [],
          expanded: expanded.has(account.id),
          balance: balances[account.id] || 0,
        });
      });

      // Second pass: build tree structure (only link asset accounts)
      assetAccounts.forEach((account) => {
        const node = accountMap.get(account.id)!;
        if (account.parentId && accountMap.has(account.parentId)) {
          const parent = accountMap.get(account.parentId)!;
          // Only add if parent is also an asset
          if (parent.type.toLowerCase() === 'asset') {
            if (!parent.children) parent.children = [];
            parent.children.push(node);
          } else {
            // Parent is not an asset, so this becomes a root node
            rootNodes.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      });

      // Calculate balances for group accounts (sum of children)
      const calculateBalances = (nodes: AccountTreeNode[]): AccountTreeNode[] => {
        return nodes.map((node) => {
          const children = node.children ? calculateBalances(node.children) : [];
          const calculatedBalance = node.isGroup
            ? children.reduce(
                (sum, child) => sum + (child.calculatedBalance || child.balance || 0),
                0
              )
            : node.balance || 0;

          return {
            ...node,
            children,
            calculatedBalance,
          };
        });
      };

      // Sort by code
      const sortByCode = (nodes: AccountTreeNode[]): AccountTreeNode[] => {
        return nodes
          .sort((a, b) => a.code.localeCompare(b.code))
          .map((node) => ({
            ...node,
            children: node.children ? sortByCode(node.children) : [],
          }));
      };

      const sortedRoots = sortByCode(rootNodes);
      const withBalances = calculateBalances(sortedRoots);
      setTree(withBalances);
    },
    []
  );

  useEffect(() => {
    if (accounts.length > 0) {
      buildTree(accounts, expandedNodes, accountBalances);
      // Calculate statistics
      const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      const groupAccounts = accounts.filter((acc) => acc.isGroup).length;
      const ledgerAccounts = accounts.filter((acc) => !acc.isGroup).length;
      setStats({
        totalAccounts: accounts.length,
        totalBalance,
        groupAccounts,
        ledgerAccounts,
      });
    } else {
      setStats(null);
    }
  }, [expandedNodes, accounts, accountBalances, buildTree]);

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
    setAllExpanded(false); // User manually toggled, so not all expanded anymore
  };

  const expandAll = () => {
    const allIds = accounts.map((acc) => acc.id);
    setExpandedNodes(new Set(allIds));
    setAllExpanded(true);
  };

  const collapseAll = () => {
    // Only keep root nodes expanded
    const rootIds = accounts.filter((acc) => !acc.parentId).map((acc) => acc.id);
    setExpandedNodes(new Set(rootIds));
    setAllExpanded(false);
  };

  const filterTree = (nodes: AccountTreeNode[], query: string): AccountTreeNode[] => {
    if (!query) return nodes;

    const filtered: AccountTreeNode[] = [];
    nodes.forEach((node) => {
      const matchesQuery =
        node.code.toLowerCase().includes(query.toLowerCase()) ||
        node.name.toLowerCase().includes(query.toLowerCase());

      const filteredChildren = node.children ? filterTree(node.children, query) : [];

      if (matchesQuery || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }
    });

    return filtered;
  };

  // Flatten tree to a flat list
  const flattenAccounts = (nodes: AccountTreeNode[]): AccountTreeNode[] => {
    const result: AccountTreeNode[] = [];
    nodes.forEach((node) => {
      result.push(node);
      if (node.children && node.children.length > 0) {
        result.push(...flattenAccounts(node.children));
      }
    });
    return result;
  };

  const filteredTree = searchQuery ? filterTree(tree, searchQuery) : tree;
  const flatAccountList = flattenAccounts(filteredTree);

  // Calculate total balance from flat list
  const totalDisplayBalance = flatAccountList.reduce((sum, account) => {
    const balance = account.isGroup ? (account.calculatedBalance ?? 0) : (account.balance ?? 0);
    return sum + balance;
  }, 0);

  if (!hasModule('cbs')) {
    return (
      <ProtectedRoute requiredModule="cbs">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">CBS module is not enabled for your subscription</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredModule="cbs">
      <div className="px-6 pt-1 pb-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-green-100 rounded-xl">
              <TrendingUp className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
              <p className="text-sm text-gray-600 mt-1">
                Chart of Accounts - Asset Accounts (सम्पत्ति खाताहरू)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAccounts}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Only show Migrate button if old accounts exist */}
            {hasOldAccounts && (
              <button
                onClick={handleMigrateAccounts}
                disabled={isMigrating}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                title="Migrate old account codes (1001, 3001, 4001) to NFRS format"
              >
                {isMigrating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Migrating...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Migrate Accounts</span>
                  </>
                )}
              </button>
            )}

            {/* Only show Seed button if no accounts exist */}
            {accounts.length === 0 && !isLoading && (
              <button
                onClick={handleSeedAccounts}
                disabled={isSeeding}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSeeding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Seeding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Seed Accounts</span>
                  </>
                )}
              </button>
            )}

            {/* Add New Ledger Button */}
            <button
              onClick={() => {
                setAccountForm({ name: '', code: '', parentId: '', nfrsMap: '' });
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 text-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Ledger</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Total Balance</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    रु.{' '}
                    {stats.totalBalance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-green-600 mt-1">कुल शेष</p>
                </div>
                <DollarSign className="h-10 w-10 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalAccounts}</p>
                  <p className="text-xs text-gray-500 mt-1">कुल खाताहरू</p>
                </div>
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Group Accounts</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.groupAccounts}</p>
                  <p className="text-xs text-gray-500 mt-1">समूह खाताहरू</p>
                </div>
                <Folder className="h-10 w-10 text-blue-400" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ledger Accounts</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.ledgerAccounts}</p>
                  <p className="text-xs text-gray-500 mt-1">लेजर खाताहरू</p>
                </div>
                <FileText className="h-10 w-10 text-indigo-400" />
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading accounts...</p>
              <p className="text-sm text-gray-400 mt-1">
                Please wait while we fetch your chart of accounts
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-xl">!</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error Loading Accounts</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchAccounts}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
            {/* Search Bar and Controls */}
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by account code or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-2"></div>
              </div>
              {searchQuery && (
                <div className="mt-3 text-sm text-gray-600">
                  Found {flatAccountList.length} account(s) matching "{searchQuery}"
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Account Code & Name</span>
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <Folder className="h-4 w-4" />
                        <span>Type</span>
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      NFRS Mapping
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center justify-end space-x-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Balance (रु.)</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {flatAccountList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">
                          {searchQuery
                            ? 'No accounts found matching your search'
                            : accounts.length === 0
                              ? 'No asset accounts found'
                              : 'No accounts match your search'}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                          {searchQuery
                            ? 'Try adjusting your search terms'
                            : accounts.length === 0
                              ? 'Click "Seed Chart of Accounts" button above to populate the default NFRS-compliant chart of accounts'
                              : 'No matching accounts'}
                        </p>
                        {accounts.length === 0 && !searchQuery && (
                          <button
                            onClick={handleSeedAccounts}
                            disabled={isSeeding}
                            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
                          >
                            {isSeeding ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Seeding Accounts...</span>
                              </>
                            ) : (
                              <span>Seed Chart of Accounts</span>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    flatAccountList.map((account) => {
                      const displayBalance = account.isGroup
                        ? (account.calculatedBalance ?? 0)
                        : (account.balance ?? 0);
                      return (
                        <tr
                          key={account.id}
                          className={`border-b border-gray-100 hover:bg-indigo-50/50 transition-colors ${
                            account.isGroup ? 'bg-gray-50/30' : ''
                          }`}
                        >
                          {/* Account Code & Name */}
                          <td className="px-4 py-2">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`flex-shrink-0 ${account.isGroup ? 'text-blue-500' : 'text-gray-400'}`}
                              >
                                {account.isGroup ? (
                                  <Folder className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </div>

                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <span
                                  className={`font-mono flex-shrink-0 ${account.isGroup ? 'text-xs font-bold text-gray-700' : 'text-xs text-gray-600'}`}
                                >
                                  {account.code}
                                </span>
                                <span className="text-gray-400">-</span>
                                <span
                                  className={`${account.isGroup ? 'text-xs text-gray-900 font-medium' : 'text-xs text-gray-800'} truncate`}
                                >
                                  {account.name}
                                </span>
                                {!account.isGroup && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(account);
                                    }}
                                    className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex-shrink-0"
                                    title="Edit Account"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                account.isGroup
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}
                            >
                              {account.isGroup ? 'Group' : 'Ledger'}
                            </span>
                          </td>

                          {/* NFRS */}
                          <td className="px-4 py-2 whitespace-nowrap">
                            {account.nfrsMap ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                NFRS {account.nfrsMap}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">—</span>
                            )}
                          </td>

                          {/* Balance & Actions */}
                          <td className="px-4 py-2 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-3">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">रु.</span>
                                <span
                                  className={`${account.isGroup ? 'text-sm font-bold' : 'text-xs font-semibold'} ${
                                    displayBalance >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  {Math.abs(displayBalance).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              {!account.isGroup && (
                                <button
                                  onClick={() =>
                                    router.push(`/general-ledger/statement/${account.id}`)
                                  }
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  title="View Statement"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with summary */}
            {flatAccountList.length > 0 && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t-2 border-gray-200">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
                  <div className="flex items-center space-x-6 text-sm">
                    <div>
                      <span className="text-gray-600">Total Accounts:</span>
                      <span className="ml-2 font-bold text-gray-900">{accounts.length}</span>
                    </div>
                    {searchQuery && (
                      <div>
                        <span className="text-gray-600">Filtered:</span>
                        <span className="ml-2 font-bold text-indigo-600">
                          {flatAccountList.length}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Total Balance:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">रु.</span>
                      <span className="text-lg font-bold text-green-600">
                        {totalDisplayBalance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Account Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add New Ledger Account</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setAccountForm({ name: '', code: '', parentId: '', nfrsMap: '' });
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    placeholder="Enter account name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Code (Optional - Auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    value={accountForm.code}
                    onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                    placeholder="Leave empty for auto-generation"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Group (Optional)
                  </label>
                  <select
                    value={accountForm.parentId}
                    onChange={(e) => setAccountForm({ ...accountForm, parentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">None (Root Level)</option>
                    {accounts
                      .filter((acc) => acc.isGroup && acc.type === 'asset')
                      .map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.code} - {group.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NFRS Mapping (Optional)
                  </label>
                  <input
                    type="text"
                    value={accountForm.nfrsMap}
                    onChange={(e) => setAccountForm({ ...accountForm, nfrsMap: e.target.value })}
                    placeholder="e.g., 4.1, 4.12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                    {error}
                  </div>
                )}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setAccountForm({ name: '', code: '', parentId: '', nfrsMap: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Account Modal */}
        {showEditModal && editingAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Account</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAccount(null);
                    setAccountForm({ name: '', code: '', parentId: '', nfrsMap: '' });
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleEditAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Code
                  </label>
                  <input
                    type="text"
                    value={accountForm.code}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Account code cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    placeholder="Enter account name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NFRS Mapping (Optional)
                  </label>
                  <input
                    type="text"
                    value={accountForm.nfrsMap}
                    onChange={(e) => setAccountForm({ ...accountForm, nfrsMap: e.target.value })}
                    placeholder="e.g., 4.1, 4.12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                    {error}
                  </div>
                )}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingAccount(null);
                      setAccountForm({ name: '', code: '', parentId: '', nfrsMap: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Updating...' : 'Update Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
