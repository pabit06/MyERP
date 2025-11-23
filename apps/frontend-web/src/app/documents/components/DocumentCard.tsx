'use client';

interface Document {
  id: string;
  docType: 'member' | 'official';
  fileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  documentType: string;
  description?: string | null;
  uploadedAt: string;
  member?: {
    memberNumber: string;
    firstName: string;
    lastName: string;
  };
  title?: string;
}

interface DocumentCardProps {
  document: Document;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDownload: (document: Document) => void;
  onPreview: (document: Document) => void;
  onDelete: (document: Document) => void;
}

export default function DocumentCard({
  document,
  isSelected,
  onSelect,
  onDownload,
  onPreview,
  onDelete,
}: DocumentCardProps) {
  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📙';
    return '📄';
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const displayName = document.title || document.fileName;
  const canPreview = document.mimeType?.includes('pdf') || document.mimeType?.includes('image');

  return (
    <div
      className={`bg-white border-2 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer ${
        isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
      }`}
      onClick={() => onSelect(document.id)}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(document.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-3xl flex-shrink-0">{getFileIcon(document.mimeType)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate" title={displayName}>
                {displayName}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {document.docType === 'member' && document.member
                  ? `${document.member.memberNumber} - ${document.member.firstName} ${document.member.lastName}`
                  : document.documentType}
              </p>
            </div>
          </div>

          {document.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{document.description}</p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
            <span>{formatFileSize(document.fileSize)}</span>
            <span>{formatDate(document.uploadedAt)}</span>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
            {canPreview && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(document);
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
              >
                Preview
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(document);
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Download
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(document);
              }}
              className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

