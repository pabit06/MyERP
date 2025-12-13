/**
 * Clear Rate Limit Script
 *
 * This script clears the rate limit for authentication endpoints.
 * Note: This only works if the server is using in-memory rate limiting.
 * For production with Redis, you would need to clear Redis keys instead.
 *
 * Usage: tsx scripts/clear-rate-limit.ts [IP_ADDRESS]
 * If no IP is provided, it will clear all rate limits (requires server restart)
 */

// Rate limiter import removed - not used in this script

const ipAddress = process.argv[2];

if (ipAddress) {
  // Try to reset for specific IP
  // Note: express-rate-limit doesn't expose a direct reset method
  // The rate limit will automatically expire after the windowMs period
  console.log(`⚠️  Rate limit for IP ${ipAddress} cannot be directly cleared.`);
  console.log(`   The rate limit will automatically reset after 15 minutes.`);
  console.log(`   To immediately clear, restart the server.`);
} else {
  console.log('⚠️  To clear rate limits:');
  console.log('   1. Restart the server (clears all in-memory rate limits)');
  console.log('   2. Wait 15 minutes for the rate limit window to expire');
  console.log('   3. For production with Redis, clear the Redis keys manually');
  console.log('');
  console.log('📝 Note: Rate limits are stored in memory by default.');
  console.log('   After 15 minutes, the rate limit window expires automatically.');
}
