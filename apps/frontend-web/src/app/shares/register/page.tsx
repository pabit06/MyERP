'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { ArrowLeft, Search, Download, Printer, ArrowUp, ArrowDown, Filter, X } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ShareAccount {
  id: string;
  certificateNo?: string;
  totalKitta: number;
  totalAmount: number;
  unitPrice: number;
  issueDate: string;
  createdAt: string;
  member: {
    id: string;
    memberNumber: string;
    firstName: string;
    lastName: string;
    fullName?: string;
  };
  _count?: {
    transactions: number;
  };
}

export default function ShareRegisterPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<ShareAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<ShareAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState({
    minKitta: '',
    maxKitta: '',
    minAmount: '',
    maxAmount: '',
    hasCertificate: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, [token]);

  useEffect(() => {
    let filtered = [...accounts];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (account) =>
          account.member.memberNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.certificateNo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.minKitta) {
      filtered = filtered.filter((acc) => acc.totalKitta >= Number(filters.minKitta));
    }
    if (filters.maxKitta) {
      filtered = filtered.filter((acc) => acc.totalKitta <= Number(filters.maxKitta));
    }
    if (filters.minAmount) {
      filtered = filtered.filter((acc) => acc.totalAmount >= Number(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter((acc) => acc.totalAmount <= Number(filters.maxAmount));
    }
    if (filters.hasCertificate === 'yes') {
      filtered = filtered.filter((acc) => acc.certificateNo && acc.certificateNo !== '');
    } else if (filters.hasCertificate === 'no') {
      filtered = filtered.filter((acc) => !acc.certificateNo || acc.certificateNo === '');
    }

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortBy) {
          case 'memberNumber':
            aVal = a.member.memberNumber || '';
            bVal = b.member.memberNumber || '';
            break;
          case 'memberName':
            aVal = `${a.member.firstName} ${a.member.lastName}`.toLowerCase();
            bVal = `${b.member.firstName} ${b.member.lastName}`.toLowerCase();
            break;
          case 'certificateNo':
            aVal = a.certificateNo || '';
            bVal = b.certificateNo || '';
            break;
          case 'totalKitta':
            aVal = a.totalKitta;
            bVal = b.totalKitta;
            break;
          case 'unitPrice':
            aVal = a.unitPrice;
            bVal = b.unitPrice;
            break;
          case 'totalAmount':
            aVal = a.totalAmount;
            bVal = b.totalAmount;
            break;
          case 'transactions':
            aVal = a._count?.transactions || 0;
            bVal = b._count?.transactions || 0;
            break;
          case 'issueDate':
            aVal = new Date(a.issueDate).getTime();
            bVal = new Date(b.issueDate).getTime();
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
      });
    }

    setFilteredAccounts(filtered);
  }, [searchTerm, accounts, sortBy, sortOrder, filters]);

  const fetchAccounts = async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/shares/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
        setFilteredAccounts(data.accounts || []);
      } else {
        setError('Failed to load share register');
      }
    } catch (err) {
      setError('Error loading share register');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create CSV content
    const headers = [
      'S.N.',
      'Member Number',
      'Member Name',
      'Certificate No.',
      'Total Kitta',
      'Unit Price',
      'Total Amount',
      'Transactions',
      'Issue Date',
    ];
    const rows = filteredAccounts.map((account, index) => [
      index + 1,
      account.member.memberNumber || '',
      `${account.member.firstName} ${account.member.lastName}`.trim(),
      account.certificateNo || '-',
      account.totalKitta,
      account.unitPrice,
      account.totalAmount,
      account._count?.transactions || 0,
      new Date(account.issueDate).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `share-register-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setFilters({
      minKitta: '',
      maxKitta: '',
      minAmount: '',
      maxAmount: '',
      hasCertificate: '',
    });
    setSearchTerm('');
    setSortBy('');
    setSortOrder('asc');
  };

  const hasActiveFilters = () => {
    return (
      filters.minKitta !== '' ||
      filters.maxKitta !== '' ||
      filters.minAmount !== '' ||
      filters.maxAmount !== '' ||
      filters.hasCertificate !== '' ||
      searchTerm !== '' ||
      sortBy !== ''
    );
  };

  // Calculate totals
  const totalKitta = filteredAccounts.reduce((sum, acc) => sum + acc.totalKitta, 0);
  const totalAmount = filteredAccounts.reduce((sum, acc) => sum + acc.totalAmount, 0);
  const totalMembers = filteredAccounts.length;

  return (
    <ProtectedRoute requiredModule="cbs">
      <div className="p-6">
        <Link
          href="/shares"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shares
        </Link>

        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Share Register</h1>
            <p className="text-gray-600">Complete list of all shareholders and their share details</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600">Total Shareholders</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{totalMembers}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600">Total Kitta</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {totalKitta.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600">Total Share Capital</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              रु. {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by member number, name, or certificate number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Filter Row */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filters</span>
              </div>
              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Min Kitta
                </label>
                <input
                  type="number"
                  value={filters.minKitta}
                  onChange={(e) => setFilters({ ...filters, minKitta: e.target.value })}
                  placeholder="Min"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Kitta
                </label>
                <input
                  type="number"
                  value={filters.maxKitta}
                  onChange={(e) => setFilters({ ...filters, maxKitta: e.target.value })}
                  placeholder="Max"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Min Amount
                </label>
                <input
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                  placeholder="Min"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Amount
                </label>
                <input
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                  placeholder="Max"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Certificate
                </label>
                <select
                  value={filters.hasCertificate}
                  onChange={(e) => setFilters({ ...filters, hasCertificate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All</option>
                  <option value="yes">Has Certificate</option>
                  <option value="no">No Certificate</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading share register...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      S.N.
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('memberNumber')}
                    >
                      <div className="flex items-center gap-1">
                        Member Number
                        {sortBy === 'memberNumber' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('memberName')}
                    >
                      <div className="flex items-center gap-1">
                        Member Name
                        {sortBy === 'memberName' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('certificateNo')}
                    >
                      <div className="flex items-center gap-1">
                        Certificate No.
                        {sortBy === 'certificateNo' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('totalKitta')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Total Kitta
                        {sortBy === 'totalKitta' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('unitPrice')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Unit Price
                        {sortBy === 'unitPrice' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('totalAmount')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Total Amount
                        {sortBy === 'totalAmount' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('transactions')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Transactions
                        {sortBy === 'transactions' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('issueDate')}
                    >
                      <div className="flex items-center gap-1">
                        Issue Date
                        {sortBy === 'issueDate' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                        No shareholders found
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredAccounts.map((account, index) => (
                        <tr key={account.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {account.member.memberNumber || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {account.member.firstName} {account.member.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {account.certificateNo || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {account.totalKitta.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            रु. {account.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                            रु.{' '}
                            {account.totalAmount.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            {account._count?.transactions || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(account.issueDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                        <td colSpan={4} className="px-6 py-4 text-sm text-gray-900">
                          Total ({totalMembers} Shareholders)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {totalKitta.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          रु.{' '}
                          {totalAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td colSpan={2} className="px-6 py-4"></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

