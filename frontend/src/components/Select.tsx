'use client';

import {
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, value, defaultValue, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const selectRef = useRef<HTMLSelectElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [internalValue, setInternalValue] = useState('');
    const showSearch = options.length > 5;

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (!containerRef.current) return;
        if (!containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchValue('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      if (value !== undefined && value !== null) {
        setInternalValue(String(value));
        return;
      }

      if (defaultValue !== undefined && defaultValue !== null) {
        setInternalValue(String(defaultValue));
        return;
      }

      if (selectRef.current?.value !== undefined) {
        setInternalValue(selectRef.current.value);
      }
    }, [value, defaultValue, options]);

    const effectiveValue = value !== undefined && value !== null ? String(value) : internalValue;
    const selectedOption = options.find((option) => option.value === effectiveValue);

    const filteredOptions = useMemo(() => {
      if (!showSearch || !searchValue.trim()) {
        return options;
      }
      const needle = searchValue.trim().toLowerCase();
      return options.filter((option) => option.label.toLowerCase().includes(needle));
    }, [options, searchValue, showSearch]);

    const handleSelect = (nextValue: string) => {
      if (value === undefined || value === null) {
        setInternalValue(nextValue);
      }
      setIsOpen(false);
      setSearchValue('');

      if (selectRef.current) {
        selectRef.current.value = nextValue;
      }

      if (props.onChange) {
        props.onChange({
          target: {
            value: nextValue,
            name: props.name,
          },
        } as ChangeEvent<HTMLSelectElement>);
      }

      if (props.onBlur) {
        props.onBlur({
          target: {
            value: nextValue,
            name: props.name,
          },
        } as FocusEvent<HTMLSelectElement>);
      }
    };

    return (
      <div className="w-full" ref={containerRef}>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-secondary-700 mb-1">
            {label}
          </label>
        )}

        <button
          type="button"
          id={id}
          disabled={props.disabled}
          onClick={() => setIsOpen((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsOpen((open) => !open);
            }
            if (event.key === 'Escape') {
              setIsOpen(false);
              setSearchValue('');
            }
          }}
          className={cn(
            'w-full px-3 py-2 border rounded-lg shadow-sm transition-colors text-left',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'bg-white',
            props.disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
            error
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-secondary-300',
            className
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={selectedOption ? 'text-secondary-900' : 'text-secondary-400'}>
            {selectedOption?.label || 'Selecione...'}
          </span>
        </button>

        {isOpen && (
          <div className="relative">
            <div className="absolute z-20 mt-2 w-full rounded-lg border border-secondary-200 bg-white shadow-lg">
              {showSearch && (
                <div className="p-2 border-b border-secondary-100">
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Buscar..."
                    className={cn(
                      'w-full px-3 py-2 border rounded-md shadow-sm transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                      'placeholder:text-secondary-400',
                      error
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-secondary-300'
                    )}
                  />
                </div>
              )}
              <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
                {!searchValue.trim() && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleSelect('')}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm transition-colors',
                        effectiveValue === ''
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-secondary-700 hover:bg-secondary-50'
                      )}
                    >
                      Selecione...
                    </button>
                  </li>
                )}
                {filteredOptions.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm transition-colors',
                        option.value === effectiveValue
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-secondary-700 hover:bg-secondary-50'
                      )}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
                {filteredOptions.length === 0 && (
                  <li className="px-4 py-3 text-sm text-secondary-500">
                    Nenhuma opcao encontrada.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <select
          ref={(node) => {
            selectRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          className="sr-only"
          tabIndex={-1}
          value={effectiveValue}
          aria-hidden="true"
          {...props}
        >
          <option value="">Selecione...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
