import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ArrowRight, CalendarDays, Check, ChevronRight, Clock3,
  HeartHandshake, Mic2, Play, Radio, Search, Send, X,
} from 'lucide-react';
import HeaderNavbar from './components/HeaderNavbar';
import DynamicIconOrImage from './components/DynamicIconOrImage';
import { chapels, liturgicalThemes, masses, newsItems, serviceCards } from './data';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IMAGE_URLS = {
  hero:  'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1300&q=85',
  choir: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=900&q=80',
};

const ICON_MAP = { CalendarDays, Mic2, HeartHandshake };

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Custom hook — liturgical theme from API (with local fallback)
// ---------------------------------------------------------------------------

function useLiturgicalTheme(localTheme) {
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', localTheme.color);
    document.documentElement.style.setProperty('--accent-hover', localTheme.hover);
    document.title = `${localTheme.label} · Parokia — Notre-Dame d'Afrique`;
  }, [localTheme]);
}

// ---------------------------------------------------------------------------
// Custom hook — chapel directory (POST /api/membership-requests needs numeric IDs)
// ---------------------------------------------------------------------------

/**
 * Load the chapel directory once.
 *
 * The public form selects a chapel by name, while the API validates
 * `chapel_id: int` (`gt=0`), so the numeric identifier must come from
 * `GET /api/chapels` instead of the local mnemonic codes.
 */
function useChapelDirectory() {
  const [directory, setDirectory] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/api/chapels`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Erreur ${res.status}`))))
      .then((records) => {
        if (cancelled || !Array.isArray(records) || records.length === 0) return;
        setDirectory(records);
      })
      .catch((err) => {
        console.warn('Chapel directory unavailable, keeping the local fallback:', err.message);
      });

    return () => { cancelled = true; };
  }, []);

  return directory;
}

// ---------------------------------------------------------------------------
// Membership form hook
// ---------------------------------------------------------------------------

function useMembershipForm(chapelDirectory) {
  const [formState, setFormState] = useState({
    fullName:  '',
    choirName: '',
    chapel:    'TUNGANE',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [degraded,   setDegraded]   = useState(false);
  const [apiError,   setApiError]   = useState(null);

  const handleChange = useCallback((field) => (e) => {
    setFormState((prev) => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!formState.fullName.trim() || !formState.choirName.trim()) return;

    const chapelRecord = chapelDirectory.find((c) => c.name === formState.chapel);
    const chapelObj    = chapels.find((c) => c.name === formState.chapel);
    if (!chapelObj) return;

    // The directory and the submission share the same API: when the directory
    // could not be read, the request cannot be validated either and the form
    // degrades to a local confirmation (see docs/DECISIONS.md).
    if (!chapelRecord) {
      setDegraded(true);
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch(`${API_BASE}/api/membership-requests`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          full_name:  formState.fullName.trim(),
          choir_name: formState.choirName.trim(),
          chapel_id:  chapelRecord.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // The API answers with { error: { message, details } }; FastAPI's own
        // validation still uses { detail }.
        const details = err.error?.details;
        const detail = Array.isArray(details)
          ? details
              .map((entry) => [entry.field, entry.message].filter(Boolean).join(' : '))
              .join(' · ')
          : err.error?.message
            ?? (Array.isArray(err.detail)
              ? err.detail.map((entry) => entry.msg ?? 'champ invalide').join(' · ')
              : err.detail);
        throw new Error(detail ?? `Erreur ${res.status}`);
      }
      setSubmitted(true);
    } catch (err) {
      if (err instanceof TypeError) {
        // Graceful degradation: the API is unreachable, keep a local confirmation.
        console.warn('API not reachable, falling back to local state:', err.message);
        setDegraded(true);
        setSubmitted(true);
      } else {
        setApiError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [formState, chapelDirectory]);

  return { formState, handleChange, handleSubmit, submitting, submitted, degraded, apiError };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [theme,        setTheme]        = useState(liturgicalThemes[0]);
  const [activeChapel, setActiveChapel] = useState('TUNGANE');
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);

  useLiturgicalTheme(theme);

  const displayedMasses = useMemo(() => {
    if (activeChapel === 'Toutes les chapelles') return masses;
    const filtered = masses.filter((m) => m.chapel === activeChapel);
    return filtered.length ? filtered : masses;
  }, [activeChapel]);

  const handleChapelChange = useCallback((chapel) => {
    setActiveChapel(chapel);
    if (chapel !== 'Toutes les chapelles') {
      window.setTimeout(
        () => document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        60,
      );
    }
  }, []);

  const chapelDirectory = useChapelDirectory();
  const { formState, handleChange, handleSubmit, submitting, submitted, degraded, apiError } =
    useMembershipForm(chapelDirectory);

  // Close search drawer on Escape
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setSearchOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchOpen]);

  return (
    <div id="top">
      <HeaderNavbar
        activeChapel={activeChapel}
        onChapelChange={handleChapelChange}
        theme={theme}
        onThemeChange={setTheme}
        onSearch={() => setSearchOpen(true)}
      />

      <main className="main-shell shell">
        {/* ── Breadcrumb ──────────────────────────────────────────────── */}
        <div className="breadcrumb-row">
          <span>Accueil <strong>/</strong> La vie de la paroisse</span>
          <span className="live-mark">Fil paroissial en direct</span>
        </div>

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="hero-grid" aria-labelledby="hero-title">
          <article className="hero-story">
            <div>
              <span className="eyebrow">À la une · dimanche 05 octobre</span>
              <h1 id="hero-title" className="hero-title">
                Une même voix,<br /><em>huit chapelles</em>,<br />un seul élan.
              </h1>
              <p className="hero-summary">
                À Notre-Dame d'Afrique, la liturgie se vit comme une rencontre. Cette semaine,
                les chorales de Goma partagent leurs voix, leurs répétitions et la joie d'un
                service qui rassemble.
              </p>
            </div>
            <div className="hero-footer">
              <div className="meta-line">
                <span>Parokia · Édition du matin</span>
                <span className="meta-separator" />
                <span>4 min de lecture</span>
              </div>
              <a href="#actualites" className="text-link">
                Lire le dossier <ArrowRight size={15} />
              </a>
            </div>
          </article>

          <div className="hero-image">
            <img src={IMAGE_URLS.hero} alt="Lumière traversant les vitraux d'une église" />
            <div className="hero-image-caption">
              <div>
                <small>Chronique de la semaine</small>
                <strong>Le chant qui fait communauté</strong>
              </div>
              <button
                className="play-button"
                type="button"
                onClick={() => setIsPlaying((v) => !v)}
                aria-label={isPlaying ? 'Mettre en pause' : 'Écouter la chronique'}
              >
                {isPlaying ? <span className="pause-symbol">Ⅱ</span> : <Play size={17} fill="currentColor" />}
              </button>
            </div>
          </div>
        </section>

        {/* ── News ────────────────────────────────────────────────────── */}
        <section id="actualites" className="section-block" aria-labelledby="news-title">
          <div className="section-heading">
            <h2 id="news-title" className="section-title">Le fil de la paroisse</h2>
            <span className="section-note">Dernières nouvelles · mis à jour aujourd'hui</span>
          </div>
          <div className="news-grid">
            {newsItems.map((item) => (
              <article key={item.title} className="news-card">
                <div className="news-card-meta">
                  <span>{item.time}</span><span>·</span><span>{item.section}</span>
                </div>
                <h3 className="news-card-title">{item.title}</h3>
                <p className="news-card-text">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Agenda ──────────────────────────────────────────────────── */}
        <section id="agenda" className="section-block content-grid" aria-labelledby="agenda-title">
          <div>
            <div className="section-heading">
              <h2 id="agenda-title" className="section-title">Agenda des messes</h2>
              <span className="section-note">{activeChapel}</span>
            </div>
            <div className="mass-list">
              {displayedMasses.map((mass) => (
                <article className="mass-row" key={`${mass.date}-${mass.time}-${mass.chapel}`}>
                  <div className="mass-date">
                    <b>{mass.date}</b>
                    <small>{mass.month} · {mass.day}</small>
                  </div>
                  <div className="mass-info">
                    <div className="mass-time">
                      <Clock3 size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                      {mass.time}
                    </div>
                    <h3 className="mass-title">{mass.title}</h3>
                    <span className="mass-chapel">{mass.chapel} · {mass.choir}</span>
                  </div>
                  <span className="mass-tag">
                    {mass.color === 'gold' ? 'Solennité' : 'Messe'}
                  </span>
                </article>
              ))}
            </div>
            <button
              className="text-link"
              type="button"
              style={{ marginTop: 18 }}
              onClick={() => setActiveChapel('Toutes les chapelles')}
            >
              Voir tout l'agenda <ArrowRight size={15} />
            </button>
          </div>

          <aside className="audio-card" aria-label="Émission audio">
            <span className="audio-kicker">
              <Radio size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Parokia en écoute
            </span>
            <h2 className="audio-title">La parole qui circule, la prière qui demeure.</h2>
            <p className="audio-description">
              Une minute avec les responsables de chorales de Notre-Dame d'Afrique,
              entre répétition et service.
            </p>
            <div className="audio-controls">
              <button
                className="audio-play"
                type="button"
                onClick={() => setIsPlaying((v) => !v)}
                aria-label={isPlaying ? 'Pause' : 'Lecture'}
              >
                {isPlaying ? <span className="pause-symbol">Ⅱ</span> : <Play size={15} fill="currentColor" />}
              </button>
              <span className="audio-state">
                {isPlaying ? 'Lecture en cours · 01:18' : 'Écouter · 01:18'}
              </span>
            </div>
            <div className="waveform" aria-hidden="true">
              {Array.from({ length: 11 }).map((_, i) => <i key={i} />)}
            </div>
          </aside>
        </section>

        {/* ── Services ────────────────────────────────────────────────── */}
        <section className="section-block" aria-labelledby="services-title">
          <div className="section-heading">
            <h2 id="services-title" className="section-title">Les espaces de service</h2>
            <span className="section-note">Une communauté active, toute la semaine</span>
          </div>
          <div className="service-grid">
            {serviceCards.map((card) => {
              const Icon = ICON_MAP[card.icon];
              return (
                <article className="service-card" key={card.id}>
                  <DynamicIconOrImage icon={Icon} className="service-icon" />
                  <span className="service-kicker">{card.kicker}</span>
                  <h3 className="service-title">{card.title}</h3>
                  <p className="service-description">{card.description}</p>
                  <a
                    className="service-link"
                    href={card.id === 'adhesion' ? '#adhesion' : '#agenda'}
                  >
                    {card.link} <ChevronRight size={13} style={{ verticalAlign: 'middle' }} />
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── Membership form ─────────────────────────────────────────── */}
        <section id="adhesion" className="membership-section" aria-labelledby="membership-title">
          <div className="membership-copy">
            <span className="eyebrow">Espace responsables</span>
            <h2 id="membership-title" className="membership-title">
              Faire entrer sa chorale dans le mouvement.
            </h2>
            <p className="membership-text">
              Cette demande est réservée aux responsables de chorales. Après envoi, elle est
              examinée par l'administration paroissiale avant toute publication dans l'agenda.
            </p>
            <div className="meta-line" style={{ marginTop: 22 }}>
              <span className="pending-dot" /> Réponse sous 72 heures
            </div>
          </div>

          <form className="membership-form" onSubmit={handleSubmit} noValidate>
            {submitted ? (
              <div className="form-success">
                <Check size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
                <strong>Demande transmise en attente de validation.</strong>
                <br />L'équipe paroissiale reviendra vers vous pour confirmer l'intégration de votre chorale.
                {degraded && (
                  <>
                    <br />
                    <small>
                      Mode local : l'API paroissiale est momentanément injoignable ; la demande
                      sera à renvoyer une fois la connexion rétablie.
                    </small>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="form-field">
                  <label htmlFor="fullName">Nom complet</label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder="Ex. Grâce Mateso"
                    value={formState.fullName}
                    onChange={handleChange('fullName')}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="choirName">Nom de la chorale</label>
                  <input
                    id="choirName"
                    type="text"
                    required
                    placeholder="Ex. Les Voix d'Amani"
                    value={formState.choirName}
                    onChange={handleChange('choirName')}
                  />
                </div>
                <div className="form-field full">
                  <label htmlFor="chapel">Chapelle de rattachement</label>
                  <select
                    id="chapel"
                    value={formState.chapel}
                    onChange={handleChange('chapel')}
                  >
                    {chapels.map((c) => (
                      <option key={c.code} value={c.name}>{c.name} — {c.meaning}</option>
                    ))}
                  </select>
                </div>
                {apiError && (
                  <p className="form-error" role="alert">
                    Demande refusée : {apiError}
                  </p>
                )}
                <div className="form-submit">
                  <span className="pending-note">
                    <span className="pending-dot" />
                    Votre demande sera enregistrée en statut PENDING
                  </span>
                  <button className="submit-button" type="submit" disabled={submitting}>
                    {submitting ? 'Envoi…' : 'Envoyer la demande'}
                    {!submitting && <Send size={14} style={{ verticalAlign: 'middle', marginLeft: 5 }} />}
                  </button>
                </div>
              </>
            )}
          </form>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="shell footer-row">
          <div>
            <div className="wordmark">
              <span className="wordmark-mark"><span>PA</span></span>
              <span className="wordmark-name">PAROKIA</span>
            </div>
            <p className="footer-small">
              Le fil vivant des voix, des messes et des engagements de Notre-Dame d'Afrique, à Goma.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Pied de page">
            <a href="#top">Accueil</a>
            <a href="#agenda">Agenda</a>
            <a href="#adhesion">Chorales</a>
            <a href="#top">Nous contacter</a>
          </nav>
        </div>
      </footer>

      {/* ── Search drawer ─────────────────────────────────────────────── */}
      {searchOpen && (
        <div
          className="search-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Recherche"
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}
        >
          <div className="search-panel">
            <div className="search-top">
              <strong>Rechercher dans Parokia</strong>
              <button
                className="search-close"
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Fermer la recherche"
              >
                <X size={20} />
              </button>
            </div>
            <div className="search-input">
              <Search size={17} aria-hidden="true" />
              <input
                autoFocus
                type="search"
                placeholder="Une messe, une chapelle, une chorale…"
                aria-label="Terme de recherche"
              />
            </div>
            <p className="search-hint">
              La recherche fédérera bientôt les nouvelles, les horaires et les équipes de la paroisse.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
