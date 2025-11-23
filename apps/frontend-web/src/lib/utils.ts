import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Removes duplication from a string if it contains the same text repeated.
 * For example: "TEXT TEXT" -> "TEXT"
 * "BHANJYANG SAVING AND CREDIT COOPERATIVE SOCITY LTD. BHANJYANG SAVING AND CREDIT COOPERATIVE SOCITY LTD."
 * -> "BHANJYANG SAVING AND CREDIT COOPERATIVE SOCITY LTD."
 */
export function removeDuplication(text: string | null | undefined): string {
  if (!text) return '';

  const trimmed = text.trim();
  if (!trimmed) return '';

  // Normalize whitespace for comparison
  const normalized = trimmed.replace(/\s+/g, ' ');

  // Check if the string is exactly duplicated (same text appears twice)
  // Try splitting at different points to find duplication
  const len = normalized.length;

  // Check if the string can be split in half and both halves are identical
  if (len % 2 === 0) {
    const midPoint = len / 2;
    const firstHalf = normalized.substring(0, midPoint).trim();
    const secondHalf = normalized.substring(midPoint).trim();

    // If the two halves are identical, return just one half
    if (firstHalf === secondHalf) {
      return firstHalf;
    }
  }

  // Check for duplication with word boundaries
  // Split by spaces and check if first half equals second half
  const words = normalized.split(/\s+/);
  if (words.length >= 2 && words.length % 2 === 0) {
    const midWord = words.length / 2;
    const firstHalfWords = words.slice(0, midWord).join(' ').trim();
    const secondHalfWords = words.slice(midWord).join(' ').trim();

    // Normalize both halves for comparison (remove trailing periods/spaces)
    const normalizeForComparison = (str: string) => str.replace(/[.\s]+$/g, '').trim();
    const firstNormalized = normalizeForComparison(firstHalfWords);
    const secondNormalized = normalizeForComparison(secondHalfWords);

    if (firstNormalized === secondNormalized && firstNormalized.length > 0) {
      // Return the original first half (with proper formatting)
      return firstHalfWords.replace(/[.\s]+$/g, '').trim();
    }
  }

  // More aggressive check: try to find if the string contains a repeated pattern
  // by checking if removing the last N characters (where N is half the length)
  // results in the same string
  for (let i = Math.floor(len / 2); i > 0; i--) {
    const pattern = normalized.substring(0, i).trim();
    const remaining = normalized.substring(i).trim();

    // Check if remaining starts with the same pattern
    if (remaining.startsWith(pattern)) {
      const afterPattern = remaining.substring(pattern.length).trim();
      // If what's left is empty or just the pattern again, we have duplication
      if (!afterPattern || afterPattern === pattern) {
        return pattern;
      }
    }
  }

  return trimmed;
}
