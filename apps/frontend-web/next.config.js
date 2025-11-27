/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@myerp/shared-types'],
  // Disable editor integration to prevent wmic errors on Windows 11
  onDemandEntries: {
    // Keep pages in memory for 60 seconds
    maxInactiveAge: 60 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
