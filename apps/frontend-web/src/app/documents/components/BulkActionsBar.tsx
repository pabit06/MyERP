'use client';

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onClearSelection: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  onDelete,
  onClearSelection,
}: BulkActionsBarProps) {
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-indigo-900">
          {selectedCount} document{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Delete Selected
        </button>
        <button
          onClick={onClearSelection}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
}

