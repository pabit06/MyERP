/**
 * Nepali Date Utility Functions for Frontend
 * Provides conversion between Nepali (Bikram Sambat) and Gregorian (AD) dates
 */

// @ts-ignore - nepali-date-converter doesn't have TypeScript types
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
    // @ts-ignore
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
    // @ts-ignore - NepaliDate constructor expects month to be 0-indexed
    const nepaliDate = new NepaliDate(year, month - 1, day);
    // @ts-ignore
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
 * Format AD date to display with BS equivalent
 */
export function formatDateWithBs(adDate: Date | string): string {
  try {
    const date = typeof adDate === 'string' ? new Date(adDate) : adDate;
    if (isNaN(date.getTime())) {
      return '';
    }
    const adFormatted = date.toLocaleDateString('en-GB');
    const bsDate = adToBs(date);
    const bsFormatted = formatBsDate(bsDate);
    return `${adFormatted} (${bsFormatted})`;
  } catch (error) {
    console.error('Error formatting date with BS:', error);
    return '';
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

