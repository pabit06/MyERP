import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    
    if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'DONE' || normalizedStatus === 'SENT') {
      return 'bg-green-100 text-green-800';
    }
    if (normalizedStatus === 'PENDING' || normalizedStatus === 'DRAFT') {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (normalizedStatus === 'ACTIVE' || normalizedStatus === 'IN_PROGRESS') {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles(status)} ${className}`}>
      {status}
    </span>
  );
}

