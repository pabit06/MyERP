'use client';

import Link from 'next/link';
import Image from 'next/image';

interface MyERPLogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export default function MyERPLogo({
  showText = true,
  size = 'md',
  className = '',
}: MyERPLogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20',
    '2xl': 'h-28 w-28',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-4xl',
  };

  return (
    <Link href="/dashboard" className={`flex items-center space-x-2 ${className}`}>
      {/* MyERP Logo Image */}
      <div
        className={`${sizeClasses[size]} relative flex items-center justify-center rounded-lg overflow-hidden`}
      >
        <Image src="/myerp-logo.png" alt="MyERP Logo" fill className="object-contain" priority />
      </div>
      {showText && <span className={`${textSizes[size]} font-bold text-indigo-600`}>MyERP</span>}
    </Link>
  );
}
