import type { Config } from 'tailwindcss';
import { nedtTwPlugin } from 'react-nepali-datetime-picker';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/react-nepali-datetime-picker/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [nedtTwPlugin()],
};
export default config;
