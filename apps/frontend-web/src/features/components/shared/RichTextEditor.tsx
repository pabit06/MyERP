'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter text...',
  readOnly = false,
  className = '',
}: RichTextEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: readOnly
        ? false
        : {
            container: [
              [{ header: [1, 2, 3, false] }],
              ['bold', 'italic', 'underline'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              ['link'],
              ['clean'],
            ],
          },
    }),
    [readOnly]
  );

  const formats = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link'];

  return (
    <div className={className}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        className={readOnly ? 'ql-readonly' : ''}
      />
    </div>
  );
}
