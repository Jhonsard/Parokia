/**
 * Parokia — data.js
 * Local editorial content for the parish platform.
 * Replace these with live API calls once the backend is connected.
 */

// ---------------------------------------------------------------------------
// Chapels
// ---------------------------------------------------------------------------

export const chapels = [
  { code: 'TGN', name: 'TUNGANE',  meaning: 'Se rassembler' },
  { code: 'USH', name: 'USHINDI',  meaning: 'Victoire' },
  { code: 'AMN', name: 'AMANI',    meaning: 'Paix' },
  { code: 'MAP', name: 'MAPENDO',  meaning: 'Amour' },
  { code: 'AMK', name: 'AMKENI',   meaning: 'Éveiller' },
  { code: 'UMJ', name: 'UMOJA',    meaning: 'Unité' },
  { code: 'TND', name: 'TUNDA',    meaning: 'Porter du fruit' },
  { code: 'MWG', name: 'MWANGAZA', meaning: 'Lumière' },
];

// ---------------------------------------------------------------------------
// Liturgical themes
// ---------------------------------------------------------------------------

export const liturgicalThemes = [
  {
    id:     'marial',
    label:  'Bleu Marial',
    season: 'Fêtes mariales · Couleur paroissiale',
    color:  '#0284C7',
    hover:  '#0369A1',
  },
  {
    id:     'ordinary',
    label:  'Temps Ordinaire',
    season: 'Temps ordinaire',
    color:  '#16A34A',
    hover:  '#15803D',
  },
  {
    id:     'advent',
    label:  'Avent & Carême',
    season: 'Avent · Carême · Pénitence',
    color:  '#7C3AED',
    hover:  '#6D28D9',
  },
  {
    id:     'martyrs',
    label:  'Rouge Liturgique',
    season: 'Rameaux · Vendredi Saint · Pentecôte',
    color:  '#DC2626',
    hover:  '#B91C1C',
  },
  {
    id:     'paschal',
    label:  'Or Paschal',
    season: 'Noël · Pâques · Solennités',
    color:  '#EAB308',
    hover:  '#CA8A04',
  },
];

// ---------------------------------------------------------------------------
// Mass schedules (demo — mirror of backend seed data)
// ---------------------------------------------------------------------------

export const masses = [
  {
    date:    '05',
    month:   'Oct',
    day:     'Dimanche',
    time:    '08h00',
    title:   'Messe dominicale',
    chapel:  'TUNGANE',
    choir:   "Les Voix de l'Aube",
    color:   'blue',
  },
  {
    date:    '05',
    month:   'Oct',
    day:     'Dimanche',
    time:    '10h30',
    title:   'Messe des familles',
    chapel:  'AMANI',
    choir:   'Harmonie Shalom',
    color:   'gold',
  },
  {
    date:    '06',
    month:   'Oct',
    day:     'Lundi',
    time:    '06h30',
    title:   'Messe matinale',
    chapel:  'USHINDI',
    choir:   'Schola USHINDI',
    color:   'blue',
  },
  {
    date:    '08',
    month:   'Oct',
    day:     'Mercredi',
    time:    '17h30',
    title:   'Messe en semaine',
    chapel:  'UMOJA',
    choir:   'Chœur UMOJA',
    color:   'green',
  },
  {
    date:    '12',
    month:   'Oct',
    day:     'Dimanche',
    time:    '09h00',
    title:   'Messe des jeunes',
    chapel:  'MWANGAZA',
    choir:   'Jeunes Voix de Lumière',
    color:   'blue',
  },
];

// ---------------------------------------------------------------------------
// News items
// ---------------------------------------------------------------------------

export const newsItems = [
  {
    time:    '07h15',
    section: 'Communauté',
    title:   'Répétition générale des huit chorales avant la solennité',
    text:    "Ce samedi 04 octobre, la grande nef accueille pour la première fois l'ensemble des huit chorales paroissiales pour une répétition commune. Présence souhaitée à 15h30.",
  },
  {
    time:    'Hier',
    section: 'Pastorale',
    title:   'Nouveau lectionnaire disponible au secrétariat',
    text:    'Les lectures du dimanche en lingala et en swahili sont désormais imprimées et distribuées gratuitement avant chaque messe.',
  },
  {
    time:    '02 oct.',
    section: 'Annonce',
    title:   'La chapelle MAPENDO ouvre sa permanence hebdomadaire',
    text:    'Chaque jeudi de 16h à 18h, la chapelle MAPENDO accueille les fidèles pour la prière personnelle et la confession.',
  },
];

// ---------------------------------------------------------------------------
// Service cards
// ---------------------------------------------------------------------------

export const serviceCards = [
  {
    id:          'agenda',
    icon:        'CalendarDays',
    kicker:      'Agenda',
    title:       'Horaires des messes',
    description: 'Consultez les horaires de toutes les chapelles, filtrez par communauté et ajoutez un rendez-vous à votre agenda personnel.',
    link:        "Voir l'agenda",
  },
  {
    id:          'chorales',
    icon:        'Mic2',
    kicker:      'Chorales',
    title:       'Les chœurs de la paroisse',
    description: 'Huit chorales, huit chapelles, une seule voix. Découvrez les groupes de chant et leurs responsables.',
    link:        'Découvrir les chorales',
  },
  {
    id:          'adhesion',
    icon:        'HeartHandshake',
    kicker:      'Responsables',
    title:       "Adhésion d'une chorale",
    description: "Vous dirigez un chœur ? Déposez une demande d'intégration dans le planning paroissial en quelques secondes.",
    link:        'Faire une demande',
  },
];
