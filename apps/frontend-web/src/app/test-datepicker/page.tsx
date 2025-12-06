'use client';

import { useState } from 'react';
import { NepaliDatePicker } from '@/features/components/shared';

export default function TestDatePickerPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedBsDate, setSelectedBsDate] = useState<string>('');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Nepali Date Picker Test
        </h1>

        <div className="space-y-6">
          {/* Basic Date Picker */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Basic Date Picker</h2>
            <NepaliDatePicker
              value={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                console.log('Selected AD Date:', date);
              }}
              onBsDateChange={(bsDate) => {
                setSelectedBsDate(bsDate);
                console.log('Selected BS Date:', bsDate);
              }}
              label="Select Date"
              placeholder="Choose a date"
            />
          </div>

          {/* Required Date Picker */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Required Date Picker</h2>
            <NepaliDatePicker
              value={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              label="Required Date"
              required
            />
          </div>

          {/* Pre-filled Date Picker */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Pre-filled Date (Today)</h2>
            <NepaliDatePicker
              value={new Date().toISOString().split('T')[0]}
              onChange={(date) => console.log('Changed to:', date)}
              label="Today's Date"
            />
          </div>

          {/* Display Selected Values */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Selected Values:</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">AD Date:</span>{' '}
                <span className="text-gray-700">
                  {selectedDate || 'No date selected'}
                </span>
              </div>
              <div>
                <span className="font-medium">BS Date:</span>{' '}
                <span className="text-gray-700">
                  {selectedBsDate || 'No date selected'}
                </span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-blue-900">Test Instructions:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li>Click on the input field to open the Nepali calendar</li>
              <li>Select a date from the calendar</li>
              <li>Toggle between BS (बिक्रम सम्बत) and AD (ईस्वी) modes</li>
              <li>Check the console for date change logs</li>
              <li>Verify the selected values are displayed correctly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

