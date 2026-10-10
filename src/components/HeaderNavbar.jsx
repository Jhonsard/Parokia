import { useState } from 'react';
import { ChevronDown, Menu, Search, Sparkles, X } from 'lucide-react';
import { chapels, liturgicalThemes } from '../data';

/**
 * HeaderNavbar — top navigation bar with chapel strip and liturgical theme picker.
 *
 * Props:
 *   activeChapel   {string}    — currently selected chapel name
 *   onChapelChange {function}  — callback when a chapel is selected
 *   theme          {object}    — active liturgical theme object from data.js
 *   onThemeChange  {function}  — callback when theme is changed
 *   onSearch       {function}  — callback to open search drawer
 */
export default function HeaderNavbar({ activeChapel, onChapelChange, theme, onThemeChange, onSearch }) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  return (
    <header className="site-header">
      {/* ── Top line ───────────────────────────────────────────────────── */}
      <div className="topline shell">
        <button
          className="mobile-menu-toggle"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <a className="wordmark" href="#top" aria-label="Parokia, accueil">
          <span className="wordmark-mark"><span>PA</span></span>
          <span className="wordmark-name">PAROKIA</span>
          <span className="wordmark-location">Notre-Dame d'Afrique · Goma</span>
        </a>

        <div className="header-tools">
          {/* Liturgical theme picker */}
          <div className="theme-picker">
            <button
              className="theme-button"
              type="button"
              onClick={() => setThemeOpen((v) => !v)}
              aria-expanded={themeOpen}
              aria-haspopup="listbox"
            >
              <span className="theme-dot" style={{ backgroundColor: theme.color }} />
              <span className="theme-label">{theme.label}</span>
              <ChevronDown size={15} />
            </button>

            {themeOpen && (
              <div className="theme-menu" role="listbox" aria-label="Choisir le temps liturgique">
                <p className="theme-menu-title">
                  <Sparkles size={14} aria-hidden="true" /> Temps liturgique
                </p>
                {liturgicalThemes.map((item) => (
                  <button
                    key={item.id}
                    className="theme-option"
                    type="button"
                    role="option"
                    aria-selected={item.id === theme.id}
                    onClick={() => { onThemeChange(item); setThemeOpen(false); }}
                  >
                    <span className="theme-dot" style={{ backgroundColor: item.color }} />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.season}</small>
                    </span>
                    {item.id === theme.id && <span className="theme-check" aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onSearch}
            aria-label="Rechercher"
          >
            <Search size={19} />
          </button>

          <a className="header-cta" href="#adhesion">
            Rejoindre une chorale <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      {/* ── Chapel strip ───────────────────────────────────────────────── */}
      <nav
        className={`chapel-strip ${menuOpen ? 'is-open' : ''}`}
        aria-label="Navigation par chapelle"
      >
        <div className="shell chapel-scroll">
          <span className="strip-label">Nos chapelles</span>
          {chapels.map((chapel, index) => (
            <button
              key={chapel.code}
              className={`chapel-link ${activeChapel === chapel.name ? 'is-active' : ''}`}
              type="button"
              aria-pressed={activeChapel === chapel.name}
              title={chapel.meaning}
              onClick={() => { onChapelChange(chapel.name); setMenuOpen(false); }}
            >
              <span className="chapel-index">0{index + 1}</span>
              {chapel.name}
            </button>
          ))}
          <button
            className="all-chapels"
            type="button"
            onClick={() => onChapelChange('Toutes les chapelles')}
          >
            Tout voir <span aria-hidden="true">→</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
