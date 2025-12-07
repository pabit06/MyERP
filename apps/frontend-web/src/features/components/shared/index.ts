/**
 * Shared Components - Barrel Export
 * 
 * Components that are used across multiple features
 */

// Layout Components
export { default as Layout } from './Layout';
export { default as Header } from './Header';
export { default as Sidebar } from './Sidebar';
export { default as Navigation } from './Navigation';
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as MyERPLogo } from './MyERPLogo';

// Date Components
export { default as NepaliCalendar } from './NepaliCalendar';
export { default as NepaliDateDisplay } from './NepaliDateDisplay';
export { default as NepaliDatePicker } from './NepaliDatePicker';

// UI Components
export { default as ConfirmModal } from './ConfirmModal';
export { default as RichTextEditor } from './RichTextEditor';

// Re-export UI components from ui folder
export * from './ui/button';
export * from './ui/card';
export * from './ui/input';
export * from './ui/select';
export * from './ui/checkbox';
export * from './ui/accordion';
export * from './ui/date-picker';
