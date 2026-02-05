import { useState, useRef, useEffect } from 'react';

export default function BarcodeInput({ onScan, placeholder = 'Scan barcode or type NDC...' }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setValue(v);

    // Auto-submit after 300ms of no typing (barcode scanner fires rapidly then stops)
    clearTimeout(timerRef.current);
    if (v.length >= 6) {
      timerRef.current = setTimeout(() => {
        onScan(v.trim());
        setValue('');
      }, 300);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      clearTimeout(timerRef.current);
      onScan(value.trim());
      setValue('');
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
    />
  );
}
