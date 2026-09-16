// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Command Palette (Cmd/Ctrl+K)
// ============================================================

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiCornerDownLeft, FiArrowUp, FiArrowDown, FiClock } from 'react-icons/fi';
import { getFlatNavItems } from '../../utils/navConfig';
import './CommandPalette.css';

const RECENT_KEY = 'oswago_palette_recent';
const MAX_RECENT = 4;

const getRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
};

const pushRecent = (item) => {
  const current = getRecent().filter((r) => r.path !== item.path);
  const next = [{ path: item.path, label: item.label, group: item.group }, ...current].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
};

/**
 * @param {Function} [searchData] - optional async (query) => [{ label, group, path, icon? }]
 *   Hook point for live entity search (products, customers, orders...).
 *   Left undefined, the palette still works as a page-navigation launcher.
 */
const CommandPalette = ({ searchData }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [dataResults, setDataResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navItems = useMemo(() => getFlatNavItems(user.role || ''), [user.role]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setDataResults([]);
    setActiveIndex(0);
  }, []);

  // Global shortcut + external open event (used by the Header trigger)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isShortcut) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        close();
      }
    };
    const handleExternalOpen = () => setOpen(true);

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('oswago:open-palette', handleExternalOpen);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('oswago:open-palette', handleExternalOpen);
    };
  }, [open, close]);

  // Focus input + lock scroll whenever it opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [open]);

  // Debounced live-data search (only runs if a searchData fn was passed in)
  useEffect(() => {
    if (!open || !searchData || query.trim().length < 2) {
      setDataResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchData(query.trim());
        if (!cancelled) setDataResults(results || []);
      } catch (err) {
        console.error('CommandPalette searchData error:', err);
        if (!cancelled) setDataResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, searchData]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navItems;
    return navItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    );
  }, [query, navItems]);

  const recent = useMemo(() => (query.trim() ? [] : getRecent()), [query, open]);

  // Combined, flat list used for keyboard navigation — order matters,
  // it must match the visual order rendered below.
  const results = useMemo(
    () => [...recent.map((r) => ({ ...r, isRecent: true })), ...dataResults, ...filteredNav],
    [recent, dataResults, filteredNav]
  );

  useEffect(() => setActiveIndex(0), [query, open]);

  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleSelect = (item) => {
    if (!item.isRecent) pushRecent(item);
    close();
    navigate(item.path);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) handleSelect(results[activeIndex]);
    }
  };

  if (!open) return null;

  let renderIndex = -1;

  return (
    <div className="command-palette-overlay" onClick={close}>
      <div
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="command-palette-search">
          <FiSearch size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, or jump to a product, customer, order..."
          />
          {searching && <span className="command-palette-loading">Searching...</span>}
        </div>

        <div className="command-palette-results" ref={listRef}>
          {recent.length > 0 && (
            <div className="command-palette-group-label">Recent</div>
          )}
          {recent.map((item) => {
            renderIndex += 1;
            const idx = renderIndex;
            return (
              <button
                key={`recent-${item.path}`}
                type="button"
                className={`command-palette-item ${idx === activeIndex ? 'active' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect({ ...item, isRecent: true })}
              >
                <FiClock size={16} className="command-palette-item-icon" />
                <span className="command-palette-item-label">{item.label}</span>
                <span className="command-palette-item-group">{item.group}</span>
              </button>
            );
          })}

          {dataResults.length > 0 && (
            <div className="command-palette-group-label">Results</div>
          )}
          {dataResults.map((item, i) => {
            renderIndex += 1;
            const idx = renderIndex;
            const Icon = item.icon || FiSearch;
            return (
              <button
                key={`data-${item.path}-${i}`}
                type="button"
                className={`command-palette-item ${idx === activeIndex ? 'active' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(item)}
              >
                <Icon size={16} className="command-palette-item-icon" />
                <span className="command-palette-item-label">{item.label}</span>
                <span className="command-palette-item-group">{item.group}</span>
              </button>
            );
          })}

          {filteredNav.length > 0 && (
            <div className="command-palette-group-label">
              {query.trim() ? 'Pages' : 'Go to'}
            </div>
          )}
          {filteredNav.map((item) => {
            renderIndex += 1;
            const idx = renderIndex;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                className={`command-palette-item ${idx === activeIndex ? 'active' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(item)}
              >
                <Icon size={16} className="command-palette-item-icon" />
                <span className="command-palette-item-label">{item.label}</span>
                <span className="command-palette-item-group">{item.group}</span>
              </button>
            );
          })}

          {results.length === 0 && (
            <div className="command-palette-empty">No matches for "{query}"</div>
          )}
        </div>

        <div className="command-palette-footer">
          <span><FiArrowUp size={12} /><FiArrowDown size={12} /> Navigate</span>
          <span><FiCornerDownLeft size={12} /> Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
