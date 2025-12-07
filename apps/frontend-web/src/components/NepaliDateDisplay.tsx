/**
 * Component to display dates with Nepali (BS) equivalent
 */

import { formatDateWithBs } from '@/lib/nepali-date';

interface NepaliDateDisplayProps {
  date: Date | string | null | undefined;
  showBs?: boolean;
  className?: string;
}

export default function NepaliDateDisplay({
  date,
  showBs = true,
  className = '',
}: NepaliDateDisplayProps) {
  if (!date) {
    return <span className={className}>-</span>;
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return <span className={className}>Invalid Date</span>;
    }

    if (showBs) {
      const formatted = formatDateWithBs(dateObj);
      return <span className={className}>{formatted}</span>;
    } else {
      return (
        <span className={className}>
          {dateObj.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}
        </span>
      );
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return <span className={className}>-</span>;
  }
}
