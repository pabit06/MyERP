/**
 * Script to generate and display Nepali Fiscal Years and Calendar Years
 * 
 * Usage:
 *   tsx scripts/generate-fiscal-years.ts
 *   tsx scripts/generate-fiscal-years.ts --start 2080 --count 5
 *   tsx scripts/generate-fiscal-years.ts --type fiscal
 *   tsx scripts/generate-fiscal-years.ts --type calendar
 */

import {
  getCurrentNepaliFiscalYear,
  getCurrentNepaliCalendarYear,
  generateFiscalYears,
  generateCalendarYears,
  getFiscalYearRange,
  getCalendarYearRange,
} from '../src/lib/nepali-fiscal-year.js';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function displayYearRange(year: any) {
  console.log(`\n${year.label} (${year.type === 'fiscal' ? 'Fiscal Year' : 'Calendar Year'}):`);
  console.log(`  BS Year: ${year.bsYear}`);
  console.log(`  AD Years: ${year.adYearStart} - ${year.adYearEnd}`);
  console.log(`  Start: ${formatDate(year.startDate)} (${year.startDate.toLocaleDateString('en-GB')})`);
  console.log(`  End:   ${formatDate(year.endDate)} (${year.endDate.toLocaleDateString('en-GB')})`);
  console.log(`  Duration: ${Math.ceil((year.endDate.getTime() - year.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`);
}

function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 
                  (args.includes('--fiscal') ? 'fiscal' : 
                   args.includes('--calendar') ? 'calendar' : 'both');
  const startArg = args.find(arg => arg.startsWith('--start='))?.split('=')[1];
  const countArg = args.find(arg => arg.startsWith('--count='))?.split('=')[1] || '10';

  console.log('='.repeat(80));
  console.log('Nepali Fiscal Year & Calendar Year Generator');
  console.log('='.repeat(80));

  // Display current years
  if (typeArg === 'both' || typeArg === 'fiscal') {
    console.log('\n📅 CURRENT FISCAL YEAR (श्रावण-आषाढ):');
    const currentFY = getCurrentNepaliFiscalYear();
    displayYearRange(currentFY);
  }

  if (typeArg === 'both' || typeArg === 'calendar') {
    console.log('\n📅 CURRENT CALENDAR YEAR (बैशाख-चैत्र):');
    const currentCY = getCurrentNepaliCalendarYear();
    displayYearRange(currentCY);
  }

  // Generate multiple years if start year is provided
  if (startArg) {
    const startYear = parseInt(startArg);
    const count = parseInt(countArg);

    if (isNaN(startYear)) {
      console.error('\n❌ Error: Invalid start year. Please provide a valid BS year (e.g., 2080)');
      process.exit(1);
    }

    if (typeArg === 'both' || typeArg === 'fiscal') {
      console.log(`\n\n📊 GENERATING ${count} FISCAL YEARS STARTING FROM ${startYear}:`);
      console.log('='.repeat(80));
      const fiscalYears = generateFiscalYears(startYear, count);
      fiscalYears.forEach(displayYearRange);
    }

    if (typeArg === 'both' || typeArg === 'calendar') {
      console.log(`\n\n📊 GENERATING ${count} CALENDAR YEARS STARTING FROM ${startYear}:`);
      console.log('='.repeat(80));
      const calendarYears = generateCalendarYears(startYear, count);
      calendarYears.forEach(displayYearRange);
    }
  } else {
    // Show next 5 years by default
    const currentFY = getCurrentNepaliFiscalYear();
    const currentCY = getCurrentNepaliCalendarYear();

    if (typeArg === 'both' || typeArg === 'fiscal') {
      console.log(`\n\n📊 NEXT 5 FISCAL YEARS:`);
      console.log('='.repeat(80));
      const fiscalYears = generateFiscalYears(currentFY.bsYear, 5);
      fiscalYears.forEach(displayYearRange);
    }

    if (typeArg === 'both' || typeArg === 'calendar') {
      console.log(`\n\n📊 NEXT 5 CALENDAR YEARS:`);
      console.log('='.repeat(80));
      const calendarYears = generateCalendarYears(currentCY.bsYear, 5);
      calendarYears.forEach(displayYearRange);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Usage Examples:');
  console.log('  tsx scripts/generate-fiscal-years.ts');
  console.log('  tsx scripts/generate-fiscal-years.ts --start=2080 --count=5');
  console.log('  tsx scripts/generate-fiscal-years.ts --type=fiscal');
  console.log('  tsx scripts/generate-fiscal-years.ts --type=calendar');
  console.log('  tsx scripts/generate-fiscal-years.ts --start=2081 --count=3 --type=fiscal');
  console.log('='.repeat(80));
}

main();

