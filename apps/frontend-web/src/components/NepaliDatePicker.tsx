'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';
import NepaliDate from 'nepali-date-converter';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const [bsDate, setBsDate] = useState<string>('');
  const [adDate, setAdDate] = useState<string>(value || '');
  const [calendarType, setCalendarType] = useState<'AD' | 'BS'>('BS');

  // Convert AD to BS on mount and when value changes
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const nepaliDate = new NepaliDate(date);
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

  // Update input value when bsDate changes (after picker is initialized)
  useEffect(() => {
    if (inputRef.current && initializedRef.current) {
      inputRef.current.value = bsDate || '';
    }
  }, [bsDate]);

  // Initialize the Nepali Date Picker
  useEffect(() => {
    let handleInputChange: ((e: Event) => void) | null = null;

    // Check if library is loaded and initialize
    const initializePicker = () => {
      if (inputRef.current && !initializedRef.current && typeof window !== 'undefined') {
        // Check if NepaliDatePicker is available (library loaded)
        // @ts-expect-error - NepaliDatePicker library adds property to input element
        if (inputRef.current.NepaliDatePicker) {
          try {
            // @ts-expect-error - NepaliDatePicker library method
            inputRef.current.NepaliDatePicker({
              dateFormat: 'YYYY-MM-DD',
              ndpYear: true,
              ndpMonth: true,
              ndpYearCount: 10,
              disableDaysAfter: 0,
              disableDaysBefore: 0,
            });

            // Set initial value if provided
            if (bsDate && inputRef.current) {
              inputRef.current.value = bsDate;
            }

            // Listen to input changes (the library updates the input value when date is selected)
            handleInputChange = (e: Event) => {
              const target = e.target as HTMLInputElement;
              const selectedDate = target.value;
              if (selectedDate) {
                handleBsDateChange(selectedDate);
              } else {
                // Date cleared
                setBsDate('');
                setAdDate('');
                onChange('');
                if (onBsDateChange) {
                  onBsDateChange('');
                }
              }
            };

            // Listen to both change and input events
            inputRef.current.addEventListener('change', handleInputChange);
            inputRef.current.addEventListener('input', handleInputChange);

            initializedRef.current = true;
          } catch (error) {
            console.error('Error initializing Nepali Date Picker:', error);
          }
        }
      }
    };

    // Try to initialize immediately (in case script is already loaded)
    initializePicker();

    // Also listen for script load event
    if (typeof window !== 'undefined') {
      // @ts-expect-error - Custom property added to window object
      if (window.nepaliDatePickerLoaded) {
        initializePicker();
      } else {
        // Wait a bit for script to load
        const checkInterval = setInterval(() => {
          if (inputRef.current && !initializedRef.current) {
            // @ts-expect-error - NepaliDatePicker library adds property to input element
            if (inputRef.current.NepaliDatePicker) {
              initializePicker();
              clearInterval(checkInterval);
            }
          }
        }, 100);

        // Cleanup interval after 5 seconds
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    }

    // Cleanup function
    return () => {
      // Capture the current ref value to avoid stale closure
      const inputElement = inputRef.current;
      const handler = handleInputChange;
      if (inputElement && handler) {
        inputElement.removeEventListener('change', handler);
        inputElement.removeEventListener('input', handler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle BS date change from the picker
  const handleBsDateChange = useCallback(
    (bsDateString: string) => {
      try {
        if (!bsDateString) {
          setBsDate('');
          setAdDate('');
          onChange('');
          if (onBsDateChange) {
            onBsDateChange('');
          }
          return;
        }

        // Parse BS date (format: YYYY-MM-DD)
        const [year, month, day] = bsDateString.split('-').map(Number);
        if (!year || !month || !day) {
          console.error('Invalid BS date format:', bsDateString);
          return;
        }

        setBsDate(bsDateString);

        // Convert BS to AD (NepaliDate constructor expects month to be 0-indexed)
        const nepaliDate = new NepaliDate(year, month - 1, day);
        const adDateObj = nepaliDate.toJsDate();
        const isoString = adDateObj.toISOString().split('T')[0];

        setAdDate(isoString);
        onChange(isoString);

        if (onBsDateChange) {
          onBsDateChange(bsDateString);
        }
      } catch (error) {
        console.error('Error handling BS date change:', error);
      }
    },
    [onChange, onBsDateChange]
  );

  // Handle AD date selection (native date input)
  const handleAdDateChange = (adDateString: string) => {
    setAdDate(adDateString);
    if (adDateString) {
      try {
        const date = new Date(adDateString);
        if (!isNaN(date.getTime())) {
          const nepaliDate = new NepaliDate(date);
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

  // Load CSS dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/nepali.datepicker.v5.0.6.min.css';
      link.id = 'nepali-datepicker-css';

      // Check if already added
      if (!document.getElementById('nepali-datepicker-css')) {
        document.head.appendChild(link);
      }
    }
  }, []);

  return (
    <>
      {/* Load JS */}
      <Script
        src="/nepali.datepicker.v5.0.6.min.js"
        strategy="lazyOnload"
        onLoad={() => {
          if (typeof window !== 'undefined') {
            (window as unknown as Record<string, unknown>).nepaliDatePickerLoaded = true;
          }
        }}
      />
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
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={placeholder || 'Select date'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  readOnly
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
    </>
  );
}
