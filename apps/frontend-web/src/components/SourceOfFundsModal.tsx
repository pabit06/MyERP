'use client';

import { useState } from 'react';

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
  const [declaredText, setDeclaredText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // TODO: Upload attachment to server and get path
      const attachmentPath = attachment ? await uploadAttachment(attachment) : undefined;

      await onSubmit(declaredText, attachmentPath);
      setDeclaredText('');
      setAttachment(null);
      onClose();
    } catch (error) {
      console.error('Error submitting SOF declaration:', error);
      alert('Failed to submit source of funds declaration');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadAttachment = async (file: File): Promise<string> => {
    // TODO: Implement file upload to server
    // For now, return a placeholder
    return `/uploads/sof/${Date.now()}-${file.name}`;
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
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              className="w-full border rounded px-3 py-2"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload supporting documents (e.g., bank statement, sale deed, etc.)
            </p>
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
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Declaration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
