import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import StatusBadge from './StatusBadge';
import { Darta, PatraChalani } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ViewRecordModalProps {
  type: 'darta' | 'chalani';
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ViewRecordModal({ type, id, isOpen, onClose }: ViewRecordModalProps) {
  const { token } = useAuth();
  const [recordDetails, setRecordDetails] = useState<Darta | PatraChalani | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && id) {
      fetchRecordDetails();
    }
  }, [isOpen, id, type]);

  const fetchRecordDetails = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = type === 'darta' ? `/darta/${id}` : `/patra-chalani/${id}`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch record details' }));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch record details');
      }
      
      const data = await response.json();
      const record = type === 'darta' ? data.darta : data.patraChalani;
      
      if (!record) {
        throw new Error('Record not found');
      }
      
      setRecordDetails(record);
    } catch (err: any) {
      const errorMessage = err?.message || 'Error fetching record details';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching record details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8 border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {type === 'darta' ? 'Darta Details' : 'Chalani Details'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                 Details for Record ID: <span className="font-mono text-gray-700">{recordDetails?.dartaNumber || recordDetails?.chalaniNumber || id}</span>
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading record details...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Record</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={fetchRecordDetails}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : recordDetails ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {type === 'darta' ? 'Darta Number' : 'Chalani Number'}
                  </label>
                  <p className="text-xl font-semibold text-gray-900">
                    {type === 'darta' ? recordDetails.dartaNumber : recordDetails.chalaniNumber}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                  <StatusBadge status={recordDetails.status} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {type === 'darta' ? 'Title' : 'Subject'}
                  </label>
                  <p className="text-lg text-gray-900 font-medium">
                    {type === 'darta' ? recordDetails.title : recordDetails.subject}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Priority</label>
                  <p className="text-lg text-gray-900 capitalize">{recordDetails.priority}</p>
                </div>
                 {/* Sender/Receiver Info */}
                 {(type === 'darta' ? (recordDetails as Darta).senderName : (recordDetails as PatraChalani).receiverName) && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {type === 'darta' ? 'Received From' : 'Sent To'}
                    </label>
                    <p className="text-lg text-gray-900">
                      {type === 'darta' 
                        ? ((recordDetails as Darta).senderName || '-')
                        : ((recordDetails as PatraChalani).receiverName || '-')}
                    </p>
                  </div>
                )}
                 {/* Description/Remarks */}
                {(recordDetails.description || recordDetails.remarks) && (
                   <div className="col-span-2 bg-white border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Description / Remarks</label>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {recordDetails.description || recordDetails.remarks || 'No description provided.'}
                    </p>
                  </div>
                )}
              </div>

              {recordDetails.documents && recordDetails.documents.length > 0 && (
                <div className="border-t pt-6">
                  <label className="block text-lg font-bold text-gray-900 mb-4">Documents & Attachments</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recordDetails.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.title || doc.fileName}</p>
                            <p className="text-xs text-gray-500">Document</p>
                          </div>
                        </div>
                        <a
                          href={`${API_URL}/${type === 'darta' ? 'darta' : 'patra-chalani'}/${id}/download/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-md hover:bg-indigo-100 transition-colors"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Record not found</div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="bg-gray-50 px-8 py-4 border-t flex justify-end">
            <button
             onClick={onClose}
             className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
}

