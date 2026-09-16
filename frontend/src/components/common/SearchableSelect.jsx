// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Searchable Select
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiChevronDown } from 'react-icons/fi';
import './SearchableSelect.css';

const SearchableSelect = ({
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Type to search...',
  fetchOptions,
  getOptionLabel,
  getOptionValue,
  getOptionMeta,
  minChars = 0,
  initialOption = null,
  disabled = false,
  required = false
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(initialOption);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch options when search changes (debounced 300ms)
  useEffect(() => {
    if (!open) return;
    if (search.length > 0 && search.length < minChars) return;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await fetchOptions(search);
        setOptions(results || []);
      } catch (error) {
        console.error('SearchableSelect fetch error:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open, fetchOptions, minChars]);

  // When value changes externally, try to resolve the option label
  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }
    if (selectedOption && getOptionValue(selectedOption) === value) return;

    let cancelled = false;
    const resolve = async () => {
      try {
        const results = await fetchOptions('');
        if (cancelled) return;
        const found = (results || []).find((o) => getOptionValue(o) === value);
        if (found) setSelectedOption(found);
      } catch {
        // ignore
      }
    };
    resolve();
    return () => { cancelled = true; };
  }, [value, fetchOptions, getOptionValue, selectedOption]);

  const handleSelect = (option) => {
    setSelectedOption(option);
    onChange(getOptionValue(option), option);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedOption(null);
    onChange('', null);
    setSearch('');
  };

  const handleTriggerClick = () => {
    if (disabled) return;
    setOpen((v) => !v);
    if (!open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const displayLabel = selectedOption ? getOptionLabel(selectedOption) : '';

  return (
    <div ref={containerRef} className="searchable-select" data-disabled={disabled}>
      <div
        className={`searchable-select-trigger ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleTriggerClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTriggerClick();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedOption ? (
          <span className="searchable-select-value">{displayLabel}</span>
        ) : (
          <span className="searchable-select-placeholder">{placeholder}</span>
        )}

        {selectedOption && !disabled && (
          <button
            type="button"
            className="searchable-select-clear"
            onClick={handleClear}
            aria-label="Clear selection"
          >
            <FiX size={14} />
          </button>
        )}

        <FiChevronDown
          size={16}
          className={`searchable-select-chevron ${open ? 'open' : ''}`}
          aria-hidden="true"
        />
      </div>

      {required && (
        <input
          type="text"
          value={value || ''}
          required
          tabIndex={-1}
          onChange={() => {}}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            width: 1,
            height: 1
          }}
        />
      )}

      {open && (
        <div className="searchable-select-dropdown" role="listbox">
          <div className="searchable-select-search">
            <FiSearch size={16} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>

          <div className="searchable-select-options">
            {loading && (
              <div className="searchable-select-message">Searching...</div>
            )}

            {!loading && options.length === 0 && (
              <div className="searchable-select-message">
                {search ? 'No matches' : 'Start typing to search'}
              </div>
            )}

            {!loading && options.map((option) => {
              const optValue = getOptionValue(option);
              const isSelected = optValue === value;
              return (
                <div
                  key={optValue}
                  className={`searchable-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="searchable-select-option-label">
                    {getOptionLabel(option)}
                  </span>
                  {getOptionMeta && (
                    <span className="searchable-select-option-meta">
                      {getOptionMeta(option)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;