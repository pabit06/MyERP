'use client';

import * as React from 'react';
import { Input } from './input';

export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ value: _value, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const date = event.target.value ? new Date(event.target.value) : undefined;
      onChange(date);
    };

    return <Input type="date" ref={ref} onChange={handleChange} {...props} />;
  }
);
DatePicker.displayName = 'DatePicker';

export { DatePicker };
