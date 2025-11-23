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

interface DocumentListProps {
  documents: Document[];
  selectedDocuments: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onDownload: (document: Document) => void;
  onPreview: (document: Document) => void;
  onDelete: (document: Document) => void;
}

export default function DocumentList({
  documents,
  selectedDocuments,
  onSelect,
  onSelectAll,
  onDownload,
  onPreview,
  onDelete,
}: DocumentListProps) {
  const allSelected = documents.length > 0 && selectedDocuments.size === documents.length;

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
    if (!bytes) return '-';
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canPreview = (mimeType?: string | null) => {
    return mimeType?.includes('pdf') || mimeType?.includes('image');
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Document
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Size
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Uploaded
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((document) => {
              const displayName = document.title || document.fileName;
              const isSelected = selectedDocuments.has(document.id);

              return (
                <tr
                  key={document.id}
                  className={isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelect(document.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getFileIcon(document.mimeType)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate" title={displayName}>
                          {displayName}
                        </div>
                        {document.description && (
                          <div className="text-sm text-gray-500 truncate" title={document.description}>
                            {document.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {document.docType === 'member' && document.member
                        ? `Member: ${document.member.memberNumber}`
                        : document.documentType}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">{document.docType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(document.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(document.uploadedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {canPreview(document.mimeType) && (
                        <button
                          onClick={() => onPreview(document)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Preview
                        </button>
                      )}
                      <button
                        onClick={() => onDownload(document)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => onDelete(document)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

