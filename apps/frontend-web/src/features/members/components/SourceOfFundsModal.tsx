'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SourceOfFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (declaredText: string, attachmentPath?: string) => Promise<void>;
  transactionId: string;
  memberId: string;
  amount: number;
}

export default function SourceOfFundsModal({
  isOpen,
  onClose,
  onSubmit,
  transactionId,
  memberId,
  amount,
}: SourceOfFundsModalProps) {
  const { token } = useAuth();
  const [declaredText, setDeclaredText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUploadError(null);

    try {
      let attachmentPath: string | undefined;

      // Upload attachment if provided
      if (attachment) {
        setUploading(true);
        try {
          attachmentPath = await uploadAttachment(attachment);
        } catch (error: any) {
          setUploadError(error.message || 'Failed to upload file');
          setSubmitting(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      // Submit SOF declaration to backend with all required fields
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/source-of-funds`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transactionId,
            memberId,
            declaredText,
            attachmentPath,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit source of funds declaration');
      }

      // Call the onSubmit callback for notification/cleanup purposes
      await onSubmit(declaredText, attachmentPath);
      setDeclaredText('');
      setAttachment(null);
      setUploadError(null);
      onClose();
    } catch (error: any) {
      console.error('Error submitting SOF declaration:', error);
      alert(error.message || 'Failed to submit source of funds declaration');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadAttachment = async (file: File): Promise<string> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/source-of-funds/upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    const data = await response.json();
    return data.filePath;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Source of Funds Declaration</h2>
        <p className="text-sm text-gray-600 mb-4">
          This transaction exceeds Rs. 10 Lakhs. Please declare the source of funds as required by
          Section 15 of the AML Directive.
        </p>
        <p className="text-sm font-semibold mb-4">
          Transaction Amount: Rs. {amount.toLocaleString()}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source of Funds Description *
            </label>
            <textarea
              value={declaredText}
              onChange={(e) => setDeclaredText(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={4}
              placeholder="Describe the source of funds (e.g., salary, business income, sale of property, etc.)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Document (Optional)
            </label>
            <input
              type="file"
              onChange={(e) => {
                setAttachment(e.target.files?.[0] || null);
                setUploadError(null);
              }}
              className="w-full border rounded px-3 py-2"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={submitting || uploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload supporting documents (e.g., bank statement, sale deed, etc.)
              <br />
              Maximum file size: 10MB. Allowed formats: PDF, JPEG, JPG, PNG
            </p>
            {attachment && (
              <p className="text-xs text-blue-600 mt-1">
                Selected: {attachment.name} ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {uploading && <p className="text-xs text-blue-600 mt-1">Uploading file...</p>}
            {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting || uploading}
            >
              {uploading ? 'Uploading...' : submitting ? 'Submitting...' : 'Submit Declaration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
