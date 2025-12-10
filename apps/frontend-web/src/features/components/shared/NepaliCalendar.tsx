'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NepaliDate from 'nepali-date-converter';
import { adToBs, getNepaliMonthName } from '../../../lib/nepali-date';

interface NepaliCalendarProps {
  onDateSelect?: (adDate: string, bsDate: string) => void;
  selectedDate?: string; // AD date in YYYY-MM-DD format
}

export default function NepaliCalendar({ onDateSelect, selectedDate }: NepaliCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'BS' | 'AD'>('BS');

  // Helper function to get days in BS month
  const getDaysInBsMonth = (bsYear: number, bsMonth: number): number => {
    // Iterate backwards from day 32 to find the last valid day
    for (let day = 32; day >= 28; day--) {
      try {
        const testDate = new NepaliDate(bsYear, bsMonth - 1, day);
        const testMonth = testDate.getMonth() + 1; // Convert to 1-indexed
        // If the month matches, this is a valid day
        if (testMonth === bsMonth) {
          return day;
        }
      } catch {
        // Invalid day, try next
        continue;
      }
    }
    // Default fallback (shouldn't happen for valid BS dates)
    return 30;
  };

  // Get current month's dates
  const getMonthDates = () => {
    if (viewMode === 'BS') {
      // BS Mode: Build calendar based on BS month boundaries
      const currentBsDate = adToBs(currentDate);
      const [bsYear, bsMonth] = currentBsDate.split('-').map(Number);

      // Get first day of BS month (gate 1)
      const firstDayBs = new NepaliDate(bsYear, bsMonth - 1, 1);
      const firstDayAd = firstDayBs.toJsDate();

      // Get number of days in BS month
      const daysInBsMonth = getDaysInBsMonth(bsYear, bsMonth);

      // Get last day of BS month (unused but kept for potential future use)
      const _lastDayBs = new NepaliDate(bsYear, bsMonth - 1, daysInBsMonth);

      // Get starting day of week for BS month's first day
      const startingDayOfWeek = firstDayAd.getDay();

      const dates: Array<{
        adDate: Date;
        bsDate: string;
        bsDay: number;
        adDay: number;
        isCurrentMonth: boolean;
      }> = [];

      // Add previous BS month's trailing days
      if (bsMonth === 1) {
        // Previous month is Chaitra of previous year
        const daysInPrevMonth = getDaysInBsMonth(bsYear - 1, 12);
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
          const bsDay = daysInPrevMonth - i;
          const dateBs = new NepaliDate(bsYear - 1, 11, bsDay);
          const dateAd = dateBs.toJsDate();
          const bsDate = `${bsYear - 1}-12-${String(bsDay).padStart(2, '0')}`;
          dates.push({
            adDate: dateAd,
            bsDate,
            bsDay,
            adDay: dateAd.getDate(),
            isCurrentMonth: false,
          });
        }
      } else {
        const daysInPrevMonth = getDaysInBsMonth(bsYear, bsMonth - 1);
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
          const bsDay = daysInPrevMonth - i;
          const dateBs = new NepaliDate(bsYear, bsMonth - 2, bsDay);
          const dateAd = dateBs.toJsDate();
          const bsDate = `${bsYear}-${String(bsMonth - 1).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`;
          dates.push({
            adDate: dateAd,
            bsDate,
            bsDay,
            adDay: dateAd.getDate(),
            isCurrentMonth: false,
          });
        }
      }

      // Add current BS month's days (starting from gate 1)
      for (let bsDay = 1; bsDay <= daysInBsMonth; bsDay++) {
        const dateBs = new NepaliDate(bsYear, bsMonth - 1, bsDay);
        const dateAd = dateBs.toJsDate();
        const bsDate = `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`;
        dates.push({
          adDate: dateAd,
          bsDate,
          bsDay,
          adDay: dateAd.getDate(),
          isCurrentMonth: true,
        });
      }

      // Add next BS month's leading days to fill the grid
      const remainingDays = 42 - dates.length;
      for (let bsDay = 1; bsDay <= remainingDays; bsDay++) {
        let nextBsYear = bsYear;
        let nextBsMonth = bsMonth + 1;
        if (nextBsMonth > 12) {
          nextBsMonth = 1;
          nextBsYear = bsYear + 1;
        }
        const dateBs = new NepaliDate(nextBsYear, nextBsMonth - 1, bsDay);
        const dateAd = dateBs.toJsDate();
        const bsDate = `${nextBsYear}-${String(nextBsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`;
        dates.push({
          adDate: dateAd,
          bsDate,
          bsDay,
          adDay: dateAd.getDate(),
          isCurrentMonth: false,
        });
      }

      return dates;
    } else {
      // AD Mode: Build calendar based on AD month boundaries (original logic)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const dates: Array<{
        adDate: Date;
        bsDate: string;
        bsDay: number;
        adDay: number;
        isCurrentMonth: boolean;
      }> = [];

      // Add previous month's trailing days
      const prevMonth = new Date(year, month, 0);
      const prevMonthDays = prevMonth.getDate();
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, prevMonthDays - i);
        const bsDate = adToBs(date);
        const [_bsYear, _bsMonthNum, bsDay] = bsDate.split('-').map(Number);
        dates.push({
          adDate: date,
          bsDate,
          bsDay,
          adDay: prevMonthDays - i,
          isCurrentMonth: false,
        });
      }

      // Add current month's days
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const bsDate = adToBs(date);
        const [_bsYear, _bsMonthNum, bsDay] = bsDate.split('-').map(Number);
        dates.push({
          adDate: date,
          bsDate,
          bsDay,
          adDay: day,
          isCurrentMonth: true,
        });
      }

      // Add next month's leading days to fill the grid
      const remainingDays = 42 - dates.length;
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        const bsDate = adToBs(date);
        const [_bsYear, _bsMonthNum, bsDay] = bsDate.split('-').map(Number);
        dates.push({
          adDate: date,
          bsDate,
          bsDay,
          adDay: day,
          isCurrentMonth: false,
        });
      }

      return dates;
    }
  };

  const dates = getMonthDates();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Get BS month and year for current view
  const currentBsDate = adToBs(currentDate);
  const [bsYear, bsMonth] = currentBsDate.split('-').map(Number);

  // When in BS mode, update currentDate to match BS month boundaries when navigating
  useEffect(() => {
    if (viewMode === 'BS') {
      const currentBsDateStr = adToBs(currentDate);
      const [currentBsYear, currentBsMonth] = currentBsDateStr.split('-').map(Number);
      // Get first day of current BS month to align the view
      const firstDayBs = new NepaliDate(currentBsYear, currentBsMonth - 1, 1);
      const firstDayAd = firstDayBs.toJsDate();
      // Only update if the current date doesn't match the first day of BS month
      if (currentDate.getTime() !== firstDayAd.getTime()) {
        setCurrentDate(firstDayAd);
      }
    }
  }, [viewMode]);

  const handlePreviousMonth = () => {
    if (viewMode === 'BS') {
      // Navigate by BS month
      const currentBsDateStr = adToBs(currentDate);
      const [bsYear, bsMonth] = currentBsDateStr.split('-').map(Number);
      let prevBsYear = bsYear;
      let prevBsMonth = bsMonth - 1;
      if (prevBsMonth < 1) {
        prevBsMonth = 12;
        prevBsYear = bsYear - 1;
      }
      // Get first day of previous BS month
      const prevMonthFirstDay = new NepaliDate(prevBsYear, prevBsMonth - 1, 1);
      setCurrentDate(prevMonthFirstDay.toJsDate());
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (viewMode === 'BS') {
      // Navigate by BS month
      const currentBsDateStr = adToBs(currentDate);
      const [bsYear, bsMonth] = currentBsDateStr.split('-').map(Number);
      let nextBsYear = bsYear;
      let nextBsMonth = bsMonth + 1;
      if (nextBsMonth > 12) {
        nextBsMonth = 1;
        nextBsYear = bsYear + 1;
      }
      // Get first day of next BS month
      const nextMonthFirstDay = new NepaliDate(nextBsYear, nextBsMonth - 1, 1);
      setCurrentDate(nextMonthFirstDay.toJsDate());
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const handleDateClick = (adDate: Date, bsDate: string) => {
    const adDateStr = adDate.toISOString().split('T')[0];
    if (onDateSelect) {
      onDateSelect(adDateStr, bsDate);
    }
  };

  const isSelected = (adDate: Date) => {
    if (!selectedDate) return false;
    const dateStr = adDate.toISOString().split('T')[0];
    return dateStr === selectedDate;
  };

  const isToday = (adDate: Date) => {
    const dateStr = adDate.toISOString().split('T')[0];
    return dateStr === todayStr;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDaysNepali = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि'];

  return (
    <div className="w-full">
      {/* Header with Month/Year and Navigation */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={handlePreviousMonth}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-gray-600" />
        </button>

        <div className="text-center">
          {viewMode === 'BS' ? (
            <div>
              <h3 className="text-xs font-semibold text-gray-900 leading-tight font-nepali">
                {getNepaliMonthName(bsMonth)} {bsYear}
              </h3>
              <p className="text-[9px] text-gray-500 leading-tight">
                {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-xs font-semibold text-gray-900 leading-tight">
                {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </h3>
              <p className="text-[9px] text-gray-500 leading-tight font-nepali">
                {getNepaliMonthName(bsMonth)} {bsYear}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleNextMonth}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-1 mb-1.5">
        <button
          onClick={() => setViewMode('BS')}
          className={`flex-1 px-2 py-0.5 text-[10px] rounded ${
            viewMode === 'BS'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          BS
        </button>
        <button
          onClick={() => setViewMode('AD')}
          className={`flex-1 px-2 py-0.5 text-[10px] rounded ${
            viewMode === 'AD'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          AD
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Week Day Headers */}
        {(viewMode === 'BS' ? weekDaysNepali : weekDays).map((day, index) => (
          <div
            key={index}
            className={`text-center text-[9px] font-semibold text-gray-600 py-0.5 ${
              viewMode === 'BS' ? 'font-nepali' : ''
            }`}
          >
            {day}
          </div>
        ))}

        {/* Calendar Dates */}
        {dates.map((dateInfo, index) => {
          const displayDay = viewMode === 'BS' ? dateInfo.bsDay : dateInfo.adDay;
          const isSelectedDate = isSelected(dateInfo.adDate);
          const isTodayDate = isToday(dateInfo.adDate);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(dateInfo.adDate, dateInfo.bsDate)}
              className={`
                aspect-square p-0 text-[10px] rounded transition-colors min-h-[28px]
                ${!dateInfo.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isSelectedDate ? 'bg-indigo-600 text-white font-semibold' : ''}
                ${!isSelectedDate && isTodayDate ? 'bg-indigo-100 text-indigo-700 font-semibold' : ''}
                ${!isSelectedDate && !isTodayDate && dateInfo.isCurrentMonth ? 'hover:bg-gray-100' : ''}
              `}
            >
              <div className="flex flex-col items-center justify-center h-full leading-none">
                <span className={`text-[10px] ${viewMode === 'BS' ? 'font-nepali' : ''}`}>
                  {displayDay}
                </span>
                {viewMode === 'BS' && (
                  <span className="text-[7px] opacity-60 leading-none mt-0.5">
                    {dateInfo.adDay}
                  </span>
                )}
                {viewMode === 'AD' && (
                  <span className="text-[7px] opacity-60 leading-none mt-0.5 font-nepali">
                    {dateInfo.bsDay}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Today Button */}
      <button
        onClick={() => {
          setCurrentDate(new Date());
          if (onDateSelect) {
            const todayBs = adToBs(today);
            onDateSelect(todayStr, todayBs);
          }
        }}
        className="w-full mt-1.5 px-2 py-0.5 text-[9px] bg-gray-100 hover:bg-gray-200 rounded transition-colors"
      >
        Today
      </button>
    </div>
  );
}
