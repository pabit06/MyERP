'use client';

import DocumentCard from './DocumentCard';

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

interface DocumentGridProps {
  documents: Document[];
  selectedDocuments: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onDownload: (document: Document) => void;
  onPreview: (document: Document) => void;
  onDelete: (document: Document) => void;
}

export default function DocumentGrid({
  documents,
  selectedDocuments,
  onSelect,
  onSelectAll,
  onDownload,
  onPreview,
  onDelete,
}: DocumentGridProps) {
  const allSelected = documents.length > 0 && selectedDocuments.size === documents.length;

  return (
    <div className="space-y-4">
      {documents.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-600">
            Select all ({documents.length} documents)
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            isSelected={selectedDocuments.has(document.id)}
            onSelect={onSelect}
            onDownload={onDownload}
            onPreview={onPreview}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

