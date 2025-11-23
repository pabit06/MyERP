/**
 * Nepali Fiscal Year Utility Functions
 * 
 * Nepal has two main year cycles:
 * 1. Calendar Year (बैशाख-चैत्र): Baisakh 1 to Chaitra end (mid-April to mid-April)
 * 2. Fiscal Year (श्रावण-आषाढ): Shrawan 1 to Ashad end (mid-July to mid-July)
 * 
 * This utility provides functions to generate and work with both year cycles.
 */

import { getBaisakh1Date, getBsMonthDates, adToBs } from './nepali-date.js';

// @ts-ignore - nepali-date-converter doesn't have TypeScript types
import NepaliDate from 'nepali-date-converter';

export interface FiscalYearRange {
  bsYear: number; // The starting BS year (e.g., 2081 for FY 2081/82)
  adYearStart: number; // Starting AD year
  adYearEnd: number; // Ending AD year
  startDate: Date; // Actual start date (Shrawan 1 or Baisakh 1)
  endDate: Date; // Actual end date (Ashad end or Chaitra end)
  label: string; // Display label (e.g., "2081/82" or "FY 2081/82")
  type: 'calendar' | 'fiscal'; // Type of year cycle
}

/**
 * Get Shrawan 1 (first day of Nepali fiscal year) date for a given BS year
 * Shrawan 1 typically falls around mid-July in the Gregorian calendar
 */
export function getShrawan1Date(bsYear: number): Date {
  try {
    // Shrawan is month 4 (1-indexed: Baisakh=1, Jestha=2, Ashad=3, Shrawan=4)
    const { monthStart } = getBsMonthDates(bsYear, 4);
    return monthStart;
  } catch (error) {
    console.error('Error getting Shrawan 1 date:', error);
    throw error;
  }
}

/**
 * Get Ashad end (last day of Nepali fiscal year) date for a given BS year
 * Ashad typically has 31-32 days and ends around mid-July
 */
export function getAshadEndDate(bsYear: number): Date {
  try {
    // Ashad is month 3 (1-indexed: Baisakh=1, Jestha=2, Ashad=3)
    const { monthEnd } = getBsMonthDates(bsYear, 3);
    return monthEnd;
  } catch (error) {
    console.error('Error getting Ashad end date:', error);
    throw error;
  }
}

/**
 * Get Chaitra end (last day of Nepali calendar year) date for a given BS year
 * Chaitra typically has 29-30 days and ends around mid-April
 */
export function getChaitraEndDate(bsYear: number): Date {
  try {
    // Chaitra is month 12 (1-indexed: last month)
    const { monthEnd } = getBsMonthDates(bsYear, 12);
    return monthEnd;
  } catch (error) {
    console.error('Error getting Chaitra end date:', error);
    throw error;
  }
}

/**
 * Get the current Nepali fiscal year (Shrawan-Ashad cycle)
 * Returns the BS year that the fiscal year starts in
 */
export function getCurrentNepaliFiscalYear(): FiscalYearRange {
  const now = new Date();
  // Get current BS date string and parse it
  const currentBsDateString = adToBs(now);
  const [currentBsYearStr, currentBsMonthStr] = currentBsDateString.split('-');
  const currentBsYear = parseInt(currentBsYearStr);
  const currentBsMonth = parseInt(currentBsMonthStr);

  let fiscalYearBsYear: number;
  let fiscalYearStart: Date;
  let fiscalYearEnd: Date;

  // Fiscal year runs from Shrawan (month 4) to Ashad (month 3 of next year)
  // If we're in Shrawan or later (months 4-12), fiscal year started this BS year
  // If we're before Shrawan (months 1-3), fiscal year started in previous BS year

  // Get Shrawan 1 of current BS year
  const currentYearShrawan1 = getShrawan1Date(currentBsYear);

  if (now >= currentYearShrawan1) {
    // We're in or past Shrawan 1 of current BS year, so fiscal year started this year
    fiscalYearBsYear = currentBsYear;
    fiscalYearStart = currentYearShrawan1;
    fiscalYearEnd = getAshadEndDate(currentBsYear + 1); // Ashad end of next BS year
  } else {
    // We're before Shrawan 1 of current BS year, so fiscal year started in previous BS year
    fiscalYearBsYear = currentBsYear - 1;
    fiscalYearStart = getShrawan1Date(fiscalYearBsYear);
    fiscalYearEnd = getAshadEndDate(currentBsYear); // Ashad end of current BS year
  }

  const startAdYear = fiscalYearStart.getFullYear();
  const endAdYear = fiscalYearEnd.getFullYear();

  return {
    bsYear: fiscalYearBsYear,
    adYearStart: startAdYear,
    adYearEnd: endAdYear,
    startDate: fiscalYearStart,
    endDate: fiscalYearEnd,
    label: `FY ${fiscalYearBsYear}/${String(fiscalYearBsYear + 1).slice(-2)}`,
    type: 'fiscal',
  };
}

/**
 * Get the current Nepali calendar year (Baisakh-Chaitra cycle)
 * Returns the BS year
 */
export function getCurrentNepaliCalendarYear(): FiscalYearRange {
  const now = new Date();
  // Get current BS date string and parse it
  const currentBsDateString = adToBs(now);
  const [currentBsYearStr] = currentBsDateString.split('-');
  const currentBsYear = parseInt(currentBsYearStr);

  const calendarYearStart = getBaisakh1Date(currentBsYear);
  const calendarYearEnd = getChaitraEndDate(currentBsYear);

  const startAdYear = calendarYearStart.getFullYear();
  const endAdYear = calendarYearEnd.getFullYear();

  return {
    bsYear: currentBsYear,
    adYearStart: startAdYear,
    adYearEnd: endAdYear,
    startDate: calendarYearStart,
    endDate: calendarYearEnd,
    label: `${currentBsYear}`,
    type: 'calendar',
  };
}

/**
 * Generate a fiscal year range for a given BS year (Shrawan-Ashad cycle)
 */
export function getFiscalYearRange(bsYear: number): FiscalYearRange {
  const startDate = getShrawan1Date(bsYear);
  const endDate = getAshadEndDate(bsYear + 1);

  const startAdYear = startDate.getFullYear();
  const endAdYear = endDate.getFullYear();

  return {
    bsYear,
    adYearStart: startAdYear,
    adYearEnd: endAdYear,
    startDate,
    endDate,
    label: `FY ${bsYear}/${String(bsYear + 1).slice(-2)}`,
    type: 'fiscal',
  };
}

/**
 * Generate a calendar year range for a given BS year (Baisakh-Chaitra cycle)
 */
export function getCalendarYearRange(bsYear: number): FiscalYearRange {
  const startDate = getBaisakh1Date(bsYear);
  const endDate = getChaitraEndDate(bsYear);

  const startAdYear = startDate.getFullYear();
  const endAdYear = endDate.getFullYear();

  return {
    bsYear,
    adYearStart: startAdYear,
    adYearEnd: endAdYear,
    startDate,
    endDate,
    label: `${bsYear}`,
    type: 'calendar',
  };
}

/**
 * Generate multiple fiscal years (Shrawan-Ashad cycles)
 * @param startBsYear Starting BS year
 * @param count Number of years to generate
 * @returns Array of fiscal year ranges
 */
export function generateFiscalYears(startBsYear: number, count: number): FiscalYearRange[] {
  const years: FiscalYearRange[] = [];
  for (let i = 0; i < count; i++) {
    years.push(getFiscalYearRange(startBsYear + i));
  }
  return years;
}

/**
 * Generate multiple calendar years (Baisakh-Chaitra cycles)
 * @param startBsYear Starting BS year
 * @param count Number of years to generate
 * @returns Array of calendar year ranges
 */
export function generateCalendarYears(startBsYear: number, count: number): FiscalYearRange[] {
  const years: FiscalYearRange[] = [];
  for (let i = 0; i < count; i++) {
    years.push(getCalendarYearRange(startBsYear + i));
  }
  return years;
}

/**
 * Get fiscal year for a specific date
 */
export function getFiscalYearForDate(date: Date): FiscalYearRange {
  // Get BS date string and parse it
  const bsDateString = adToBs(date);
  const [bsYearStr, bsMonthStr] = bsDateString.split('-');
  const bsYear = parseInt(bsYearStr);
  const bsMonth = parseInt(bsMonthStr);

  // Fiscal year runs from Shrawan (month 4) to Ashad (month 3 of next year)
  let fiscalYearBsYear: number;

  if (bsMonth >= 4) {
    // Shrawan or later: fiscal year started this BS year
    fiscalYearBsYear = bsYear;
  } else {
    // Before Shrawan: fiscal year started in previous BS year
    fiscalYearBsYear = bsYear - 1;
  }

  return getFiscalYearRange(fiscalYearBsYear);
}

/**
 * Get calendar year for a specific date
 */
export function getCalendarYearForDate(date: Date): FiscalYearRange {
  // Get BS date string and parse it
  const bsDateString = adToBs(date);
  const [bsYearStr] = bsDateString.split('-');
  const bsYear = parseInt(bsYearStr);

  return getCalendarYearRange(bsYear);
}

/**
 * Get next fiscal year
 */
export function getNextFiscalYear(): FiscalYearRange {
  const current = getCurrentNepaliFiscalYear();
  return getFiscalYearRange(current.bsYear + 1);
}

/**
 * Get previous fiscal year
 */
export function getPreviousFiscalYear(): FiscalYearRange {
  const current = getCurrentNepaliFiscalYear();
  return getFiscalYearRange(current.bsYear - 1);
}

/**
 * Get next calendar year
 */
export function getNextCalendarYear(): FiscalYearRange {
  const current = getCurrentNepaliCalendarYear();
  return getCalendarYearRange(current.bsYear + 1);
}

/**
 * Get previous calendar year
 */
export function getPreviousCalendarYear(): FiscalYearRange {
  const current = getCurrentNepaliCalendarYear();
  return getCalendarYearRange(current.bsYear - 1);
}

