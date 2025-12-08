/**
 * Optional Cron Job Setup for AML Tasks
 *
 * To enable automated AML tasks, install node-cron:
 *   pnpm add node-cron
 *   pnpm add -D @types/node-cron
 *
 * Then import and call setupAmlCronJobs() in your index.ts
 */

export async function setupAmlCronJobs() {
  try {
    // Dynamic import to avoid requiring node-cron if not installed
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - node-cron is optional dependency
    const cron = (await import('node-cron').catch(() => null)) as any;
    if (!cron) {
      throw new Error('node-cron not available');
    }
    const { runAmlCronJobs } = await import('./cron.js');

    // Run daily at 2 AM - Update KYM review dates and reassess risks
    cron.default.schedule('0 2 * * *', async () => {
      console.log('Running scheduled AML cron jobs...');
      try {
        await runAmlCronJobs();
      } catch (error) {
        console.error('Error running AML cron jobs:', error);
      }
    });

    console.log('✅ AML cron jobs scheduled (daily at 2 AM)');
  } catch {
    console.warn('⚠️  node-cron not installed. Skipping cron job setup.');
    console.warn('   To enable automated AML tasks, install: pnpm add node-cron @types/node-cron');
  }
}
