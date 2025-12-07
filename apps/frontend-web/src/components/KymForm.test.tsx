import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KymForm } from './KymForm';
import { describe, it, expect, vi } from 'vitest';

// Mock components that might cause issues in tests
vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ value, onChange }: any) => (
    <input
      data-testid="date-picker"
      value={value ? (value instanceof Date ? value.toISOString() : value) : ''}
      onChange={(e) => onChange(new Date(e.target.value))}
    />
  ),
}));

describe('KymForm', () => {
  const mockOnSubmit = vi.fn();

  it('renders the first step correctly', () => {
    render(<KymForm mode="onboarding" onSubmit={mockOnSubmit} />);
    expect(screen.getByText('1. Personal Details')).toBeInTheDocument();
    expect(screen.getByText('1. Name *')).toBeInTheDocument();
  });

  it('validates required fields on next', async () => {
    render(<KymForm mode="onboarding" onSubmit={mockOnSubmit} />);

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getAllByText(/First name is required/i)[0]).toBeInTheDocument();
    });
  });
});
