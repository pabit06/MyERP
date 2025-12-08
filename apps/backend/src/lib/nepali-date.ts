/**
 * Nepali Date Utility Functions
 * Provides conversion between Nepali (Bikram Sambat) and Gregorian (AD) dates
 */

import NepaliDate from 'nepali-date-converter';

/**
 * Convert AD date to BS date string (YYYY-MM-DD)
 */
export function adToBs(adDate: Date | string): string {
  try {
    const date = typeof adDate === 'string' ? new Date(adDate) : adDate;
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    const nepaliDate = new NepaliDate(date);
    const year = nepaliDate.getYear();
    const month = String(nepaliDate.getMonth() + 1).padStart(2, '0');
    const day = String(nepaliDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error converting AD to BS:', error);
    throw error;
  }
}

/**
 * Convert BS date string (YYYY-MM-DD) to AD date
 */
export function bsToAd(bsDate: string): Date {
  try {
    const [year, month, day] = bsDate.split('-').map(Number);
    if (!year || !month || !day) {
      throw new Error('Invalid BS date format. Expected YYYY-MM-DD');
    }
    const nepaliDate = new NepaliDate(year, month - 1, day);
    return nepaliDate.toJsDate();
  } catch (error) {
    console.error('Error converting BS to AD:', error);
    throw error;
  }
}

/**
 * Format BS date for display (e.g., "2081 बैशाख 15")
 */
export function formatBsDate(bsDate: string): string {
  try {
    const [year, month, day] = bsDate.split('-').map(Number);
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
    return `${year} ${nepaliMonths[month - 1]} ${day}`;
  } catch (error) {
    console.error('Error formatting BS date:', error);
    return bsDate;
  }
}

/**
 * Get current BS date string
 */
export function getCurrentBsDate(): string {
  return adToBs(new Date());
}

/**
 * Get Nepali month name from month number (1-12)
 */
export function getNepaliMonthName(month: number): string {
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
  return nepaliMonths[month - 1] || '';
}

/**
 * Get English month name from Nepali month number (1-12)
 */
export function getEnglishMonthName(month: number): string {
  const englishMonths = [
    'Baisakh',
    'Jestha',
    'Ashad',
    'Shrawan',
    'Bhadra',
    'Ashwin',
    'Kartik',
    'Mangsir',
    'Poush',
    'Magh',
    'Falgun',
    'Chaitra',
  ];
  return englishMonths[month - 1] || '';
}

/**
 * Get month start and end dates for a given BS year and month
 */
export function getBsMonthDates(
  bsYear: number,
  bsMonth: number
): {
  monthStart: Date;
  monthEnd: Date;
} {
  try {
    // First day of the month
    const startNepaliDate = new NepaliDate(bsYear, bsMonth - 1, 1);
    const monthStart = startNepaliDate.toJsDate();

    // Get the number of days in the month
    // @ts-expect-error - getDaysInMonth method exists but not in TypeScript types
    const daysInMonth = startNepaliDate.getDaysInMonth();

    // Last day of the month
    const endNepaliDate = new NepaliDate(bsYear, bsMonth - 1, daysInMonth);
    const monthEnd = endNepaliDate.toJsDate();
    monthEnd.setHours(23, 59, 59, 999);

    return { monthStart, monthEnd };
  } catch (error) {
    console.error('Error getting BS month dates:', error);
    throw error;
  }
}

/**
 * Parse BS date string and return year, month, day
 */
export function parseBsDate(bsDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = bsDate.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error('Invalid BS date format. Expected YYYY-MM-DD');
  }
  return { year, month, day };
}

/**
 * Get the Baisakh 1 (first day of Nepali fiscal year) date for a given BS year
 * Baisakh 1 typically falls around April 13-14 in the Gregorian calendar
 */
export function getBaisakh1Date(bsYear: number): Date {
  try {
    const baisakh1 = new NepaliDate(bsYear, 0, 1);
    return baisakh1.toJsDate();
  } catch (error) {
    console.error('Error getting Baisakh 1 date:', error);
    throw error;
  }
}

/**
 * Get the current Nepali fiscal year and its start date (Baisakh 1)
 * Returns the BS year and the actual Baisakh 1 date in AD
 */
export function getCurrentNepaliFiscalYear(): { bsYear: number; fiscalYearStart: Date } {
  const now = new Date();
  const currentBsDate = new NepaliDate(now);
  const currentBsYear = currentBsDate.getYear();
  const _currentBsMonth = currentBsDate.getMonth() + 1; // Convert to 1-indexed

  let fiscalYearBsYear: number;
  let fiscalYearStart: Date;

  // Nepali fiscal year starts on Baisakh 1 (month 1)
  // If we're in Baisakh or later (months 1-12), we're in the current fiscal year
  // If we're in Chaitra (month 12) but before Baisakh 1 of next year, we're still in previous fiscal year
  // Actually, if current month is Baisakh (1) or later, fiscal year started this BS year
  // If current month is before Baisakh, we're still in previous year's fiscal year

  // Get Baisakh 1 of current BS year
  const currentYearBaisakh1 = getBaisakh1Date(currentBsYear);

  if (now >= currentYearBaisakh1) {
    // We're in or past Baisakh 1 of current BS year, so fiscal year started this year
    fiscalYearBsYear = currentBsYear;
    fiscalYearStart = currentYearBaisakh1;
  } else {
    // We're before Baisakh 1 of current BS year, so fiscal year started in previous BS year
    fiscalYearBsYear = currentBsYear - 1;
    fiscalYearStart = getBaisakh1Date(fiscalYearBsYear);
  }

  return { bsYear: fiscalYearBsYear, fiscalYearStart };
}
