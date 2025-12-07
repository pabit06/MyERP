'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ShareAccount {
  id: string;
  certificateNo?: string;
  totalKitta: number;
  totalAmount: number;
  unitPrice: number;
  issueDate: string;
  member: {
    id: string;
    memberNumber: string;
    firstName: string;
    lastName: string;
    fullName?: string;
  };
}

export default function CertificatePrintPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;
  const [account, setAccount] = useState<ShareAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (memberId) {
      fetchAccount();
    }
  }, [memberId, token]);

  const fetchAccount = async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/shares/accounts/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAccount(data.account);
      } else {
        setError('Failed to load certificate data');
      }
    } catch (err) {
      setError('Error loading certificate data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredModule="cbs">
        <div className="p-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading certificate...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !account) {
    return (
      <ProtectedRoute requiredModule="cbs">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Certificate not found'}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredModule="cbs">
      <div className="p-6">
        {/* Print Controls - Hidden when printing */}
        <div className="mb-6 print:hidden">
          <Link
            href="/shares/certificates"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Certificates
          </Link>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Share Certificate</h1>
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Certificate
            </button>
          </div>
        </div>

        {/* Certificate */}
        <div className="bg-white border-4 border-gray-800 p-12 max-w-4xl mx-auto print:border-4 print:border-gray-800 print:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">श्री भञ्ज्याङ बचत तथा ऋण सहकारी संस्था लि.</h1>
            <p className="text-lg text-gray-600">
              Bhajyang Savings and Credit Cooperative Society Ltd.
            </p>
          </div>

          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-2">शेयर प्रमाणपत्र</h2>
            <p className="text-2xl text-gray-700">Share Certificate</p>
          </div>

          {/* Certificate Number */}
          {account.certificateNo && (
            <div className="text-right mb-8">
              <p className="text-sm text-gray-600">
                Certificate No.: <span className="font-semibold">{account.certificateNo}</span>
              </p>
            </div>
          )}

          {/* Content */}
          <div className="space-y-6 text-lg mb-12">
            <div className="flex justify-between border-b-2 border-gray-300 pb-2">
              <span className="font-semibold">सदस्यको नाम (Member Name):</span>
              <span className="text-right">
                {account.member.firstName} {account.member.lastName}
              </span>
            </div>

            <div className="flex justify-between border-b-2 border-gray-300 pb-2">
              <span className="font-semibold">शेयर सदस्य नं (Share Member No.):</span>
              <span className="text-right">{account.member.memberNumber}</span>
            </div>

            <div className="flex justify-between border-b-2 border-gray-300 pb-2">
              <span className="font-semibold">जम्मा शेयर कित्ता (Total Share Kitta):</span>
              <span className="text-right font-bold">{account.totalKitta}</span>
            </div>

            <div className="flex justify-between border-b-2 border-gray-300 pb-2">
              <span className="font-semibold">जम्मा रकम (Total Amount):</span>
              <span className="text-right font-bold">
                रु. {account.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between border-b-2 border-gray-300 pb-2">
              <span className="font-semibold">प्रति कित्ता दर (Unit Price):</span>
              <span className="text-right">रु. {account.unitPrice}</span>
            </div>

            <div className="flex justify-between border-b-2 border-gray-300 pb-2">
              <span className="font-semibold">जारी मिति (Issue Date):</span>
              <span className="text-right">
                {new Date(account.issueDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 flex justify-between">
            <div className="text-center">
              <div className="border-t-2 border-gray-800 pt-2 w-48">
                <p className="font-semibold">Secretary</p>
                <p className="text-sm text-gray-600">सचिव</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-gray-800 pt-2 w-48">
                <p className="font-semibold">Chairman</p>
                <p className="text-sm text-gray-600">अध्यक्ष</p>
              </div>
            </div>
          </div>

          {/* Seal/Stamp Area */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>This certificate is issued under the authority of the Board of Directors</p>
            <p className="mt-1">यो प्रमाणपत्र सञ्चालक समितिको अधिकार अन्तर्गत जारी गरिएको हो</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-4 {
            border-width: 4px !important;
          }
          .print\\:p-12 {
            padding: 3rem !important;
          }
        }
      `}</style>
    </ProtectedRoute>
  );
}
