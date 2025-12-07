'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Printer, Search } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Certificate {
  id: string;
  certificateNo?: string;
  totalKitta: number;
  totalAmount: number;
  issueDate: string;
  member: {
    id: string;
    memberNumber: string;
    firstName: string;
    lastName: string;
    fullName?: string;
  };
}

export default function CertificatesPage() {
  const { token } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [filteredCertificates, setFilteredCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, [token]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = certificates.filter(
        (cert) =>
          cert.member.memberNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.certificateNo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCertificates(filtered);
    } else {
      setFilteredCertificates(certificates);
    }
  }, [searchTerm, certificates]);

  const fetchCertificates = async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/shares/certificates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCertificates(data.certificates || []);
        setFilteredCertificates(data.certificates || []);
      } else {
        setError('Failed to load certificates');
      }
    } catch (err) {
      setError('Error loading certificates');
    } finally {
      setIsLoading(false);
    }
  };

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

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Share Certificates</h1>
          <p className="text-gray-600">View and print share certificates for members</p>
        </div>

        {/* Search */}
        <div className="mb-6">
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
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading certificates...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Certificate No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kitta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCertificates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No certificates found
                      </td>
                    </tr>
                  ) : (
                    filteredCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {cert.certificateNo || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{cert.member.memberNumber}</div>
                            <div className="text-gray-500">
                              {cert.member.firstName} {cert.member.lastName}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {cert.totalKitta}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          रु.{' '}
                          {cert.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(cert.issueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/shares/certificates/${cert.member.id}`}
                            className="inline-flex items-center px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Print
                          </Link>
                        </td>
                      </tr>
                    ))
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
