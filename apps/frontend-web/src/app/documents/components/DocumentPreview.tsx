'use client';

interface Document {
  id: string;
  docType: 'member' | 'official';
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  documentType: string;
  uploadedAt: string;
  title?: string;
}

interface DocumentPreviewProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (document: Document) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function DocumentPreview({
  document,
  isOpen,
  onClose,
  onDownload,
}: DocumentPreviewProps) {
  if (!isOpen) return null;

  const isImage = document.mimeType?.includes('image');
  const isPDF = document.mimeType?.includes('pdf');
  const previewUrl = `${API_URL}${document.filePath}`;
  const displayName = document.title || document.fileName;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-4">
            {displayName}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(document)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          {isImage ? (
            <div className="flex items-center justify-center min-h-full">
              <img
                src={previewUrl}
                alt={displayName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : isPDF ? (
            <div className="flex items-center justify-center min-h-full">
              <iframe
                src={previewUrl}
                className="w-full h-full min-h-[600px] border-0"
                title={displayName}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-full text-center p-8">
              <div className="text-6xl mb-4">📄</div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Preview Not Available</h4>
              <p className="text-gray-600 mb-4">
                This file type cannot be previewed in the browser.
              </p>
              <button
                onClick={() => onDownload(document)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Download to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
