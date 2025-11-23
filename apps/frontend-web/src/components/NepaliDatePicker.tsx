'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
// @ts-ignore - nepali-date-converter doesn't have TypeScript types
import NepaliDate from 'nepali-date-converter';
import type { NepaliDate as LibNepaliDate } from 'react-nepali-datetime-picker';

// Dynamically import DatePicker to avoid SSR issues
const DatePicker = dynamic(
  async () => {
    try {
      const mod = await import('react-nepali-datetime-picker');
      // Import CSS dynamically as well
      await import('react-nepali-datetime-picker/dist/style.css');
      return { default: mod.DatePicker };
    } catch (error) {
      console.error('Failed to load DatePicker:', error);
      // Return a fallback component
      return {
        default: () => (
          <div className="w-full px-3 py-2 border border-red-300 rounded-lg bg-red-50 text-red-700 text-sm">
            Date picker failed to load. Please refresh the page.
          </div>
        ),
      };
    }
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
        Loading date picker...
      </div>
    ),
  }
);

interface NepaliDatePickerProps {
  value?: string; // ISO date string (YYYY-MM-DD) or empty string
  onChange: (date: string) => void; // Returns ISO date string (YYYY-MM-DD) or empty string
  onBsDateChange?: (bsDate: string) => void; // Optional callback for BS date (YYYY-MM-DD format)
  label?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export default function NepaliDatePicker({
  value,
  onChange,
  onBsDateChange,
  label,
  required = false,
  className = '',
  placeholder = 'Select date',
}: NepaliDatePickerProps) {
  const [bsDate, setBsDate] = useState<string>('');
  const [adDate, setAdDate] = useState<string>(value || '');
  const [calendarType, setCalendarType] = useState<'AD' | 'BS'>('BS');

  // Convert AD to BS on mount and when value changes
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // @ts-ignore
          const nepaliDate = new NepaliDate(date);
          // @ts-ignore
          const bsDateString = `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
          setBsDate(bsDateString);
          setAdDate(value);
          if (onBsDateChange) {
            onBsDateChange(bsDateString);
          }
        }
      } catch (error) {
        console.error('Error converting date:', error);
      }
    } else {
      setAdDate('');
      setBsDate('');
      if (onBsDateChange) {
        onBsDateChange('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Handle BS date selection from the picker
  // The library's DatePicker returns LibNepaliDate: { year: { value, label }, month: { value, label }, date: { value, label } }
  const handleBsDateSelect = (selectedDate?: LibNepaliDate) => {
    try {
      if (!selectedDate) {
        // Clear the date
        setBsDate('');
        setAdDate('');
        onChange('');
        if (onBsDateChange) {
          onBsDateChange('');
        }
        return;
      }

      // Extract year, month, day from the library's NepaliDate format
      const year = selectedDate.year?.value;
      const month = selectedDate.month?.value; // This is 1-indexed (1-12)
      const day = selectedDate.date?.value;

      if (year === undefined || month === undefined || day === undefined) {
        console.error('Invalid date values from picker:', selectedDate);
        return;
      }

      // Format as YYYY-MM-DD (month is already 1-indexed from the library)
      const bsDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setBsDate(bsDateString);

      // Convert BS to AD (NepaliDate constructor expects month to be 0-indexed)
      // @ts-ignore
      const nepaliDate = new NepaliDate(year, month - 1, day);
      // @ts-ignore
      const adDateObj = nepaliDate.toJsDate();
      const isoString = adDateObj.toISOString().split('T')[0];

      setAdDate(isoString);
      onChange(isoString);

      if (onBsDateChange) {
        onBsDateChange(bsDateString);
      }
    } catch (error) {
      console.error('Error handling BS date selection:', error);
    }
  };

  // Handle AD date selection (native date input)
  const handleAdDateChange = (adDateString: string) => {
    setAdDate(adDateString);
    if (adDateString) {
      try {
        const date = new Date(adDateString);
        if (!isNaN(date.getTime())) {
          // @ts-ignore
          const nepaliDate = new NepaliDate(date);
          // @ts-ignore
          const bsDateString = `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
          setBsDate(bsDateString);
          if (onBsDateChange) {
            onBsDateChange(bsDateString);
          }
        }
      } catch (error) {
        console.error('Error converting AD to BS:', error);
      }
    } else {
      setBsDate('');
      if (onBsDateChange) {
        onBsDateChange('');
      }
    }
    onChange(adDateString);
  };

  // Format BS date for display
  const formatBsDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const nepaliMonths = [
      'बैशाख',
      'जेष्ठ',
      'आषाढ',
      'श्रावण',
      'भाद्र',
      'आश्विन',
      'कार्तिक',
      'मंसिर',
      'पौष',
      'माघ',
      'फाल्गुन',
      'चैत्र',
    ];
    return `${year} ${nepaliMonths[parseInt(month) - 1]} ${day}`;
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="space-y-2">
        {/* Calendar Type Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCalendarType('BS')}
            className={`px-3 py-1 text-sm rounded ${
              calendarType === 'BS'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            बिक्रम सम्बत (BS)
          </button>
          <button
            type="button"
            onClick={() => setCalendarType('AD')}
            className={`px-3 py-1 text-sm rounded ${
              calendarType === 'AD'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ईस्वी (AD)
          </button>
        </div>

        {/* Date Picker */}
        {calendarType === 'BS' ? (
          <div>
            <div className="w-full">
              <DatePicker
                onDateSelect={handleBsDateSelect}
                className="w-full"
                dateInput={{
                  placeholder: placeholder || 'Select date',
                }}
              />
            </div>
            {bsDate && adDate && (
              <p className="text-xs text-gray-500 mt-1">
                {formatBsDate(bsDate)} (AD: {adDate})
              </p>
            )}
            {!bsDate && !adDate && (
              <p className="text-xs text-gray-400 mt-1">
                Click the input above to open the calendar picker
              </p>
            )}
          </div>
        ) : (
          <div>
            <input
              type="date"
              value={adDate}
              onChange={(e) => handleAdDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            {adDate && bsDate && (
              <p className="text-xs text-gray-500 mt-1">
                BS: {formatBsDate(bsDate)} ({bsDate})
              </p>
            )}
          </div>
        )}

        {/* Helper text */}
        <p className="text-xs text-gray-400">
          {calendarType === 'BS'
            ? 'Select date using the calendar picker'
            : 'Select date in Gregorian calendar'}
        </p>
      </div>
    </div>
  );
}
