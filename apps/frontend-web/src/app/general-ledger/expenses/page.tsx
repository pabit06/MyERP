'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowDown, ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  isGroup: boolean;
  parentId: string | null;
  nfrsMap: string | null;
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
}

export default function ExpensesPage() {
  const { token, hasModule } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tree, setTree] = useState<AccountTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hasModule('cbs')) {
      setError('CBS module is not enabled for your subscription');
      setIsLoading(false);
      return;
    }
    fetchAccounts();
  }, [token, hasModule]);

  const fetchAccounts = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/accounting/accounts?type=expense`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      } else {
        setError('Error loading accounts');
      }
    } catch {
      setError('Error loading accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const buildTree = useCallback((accountsList: Account[], expanded: Set<string>) => {
    const accountMap = new Map<string, AccountTreeNode>();
    const rootNodes: AccountTreeNode[] = [];

    // First pass: create all nodes
    accountsList.forEach((account) => {
      accountMap.set(account.id, {
        ...account,
        children: [],
        expanded: expanded.has(account.id),
      });
    });

    // Second pass: build tree structure
    accountsList.forEach((account) => {
      const node = accountMap.get(account.id)!;
      if (account.parentId && accountMap.has(account.parentId)) {
        const parent = accountMap.get(account.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Sort by code
    const sortByCode = (nodes: AccountTreeNode[]): AccountTreeNode[] => {
      return nodes
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((node) => ({
          ...node,
          children: node.children ? sortByCode(node.children) : [],
        }));
    };

    setTree(sortByCode(rootNodes));
  }, []);

  useEffect(() => {
    if (accounts.length > 0) {
      buildTree(accounts, expandedNodes);
    }
  }, [expandedNodes, accounts, buildTree]);

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderAccountNode = (node: AccountTreeNode, level: number = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const indent = level * 24;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded ${
            level === 0 ? 'font-semibold' : ''
          }`}
          style={{ paddingLeft: `${12 + indent}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="mr-2 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-6 mr-2" />
          )}

          {node.isGroup ? (
            <Folder className="h-4 w-4 text-blue-500 mr-2" />
          ) : (
            <FileText className="h-4 w-4 text-gray-400 mr-2" />
          )}

          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-mono text-gray-600">{node.code}</span>
              <span className="text-sm text-gray-900">{node.name}</span>
              {node.nfrsMap && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                  NFRS {node.nfrsMap}
                </span>
              )}
            </div>
          </div>

          {node._count && node._count.ledgerEntries > 0 && (
            <span className="text-xs text-gray-500">{node._count.ledgerEntries} entries</span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>{node.children!.map((child) => renderAccountNode(child, level + 1))}</div>
        )}
      </div>
    );
  };

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
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <ArrowDown className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          </div>
          <p className="text-gray-600">Chart of Accounts - Expense Accounts</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading accounts...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                <div className="col-span-4">Account Code & Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">NFRS</div>
                <div className="col-span-4">Details</div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {tree.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No expense accounts found. Please seed the chart of accounts first.
                </div>
              ) : (
                tree.map((node) => renderAccountNode(node))
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
