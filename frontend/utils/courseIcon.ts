import { Ionicons } from '@expo/vector-icons';

type IonName = keyof typeof Ionicons.glyphMap;

export interface CourseVisual {
  icon: IonName;
  /** Themed accent. We blend with the primary palette but each subject has a distinct hue
   * for memorability — kept in 0–360 hue range so the consumer can plug into HSL. */
  hue: number;
}

/**
 * ILSTU Course Finder subject codes → Ionicon + hue.
 * Covers the common departments. Falls back to a generic book icon for unknown subjects.
 *
 * The hue is intentional, not random: we want each class card to feel distinct
 * even at a glance. The primary brand red still dominates surrounding chrome —
 * this only colours the icon disc.
 */
const SUBJECT_VISUALS: Record<string, CourseVisual> = {
  // Demo / catch-all
  DEMO: { icon: 'sparkles', hue: 350 },

  // Business / professional
  ACC: { icon: 'calculator', hue: 32 }, // Accounting
  BUS: { icon: 'briefcase', hue: 28 },
  ECN: { icon: 'trending-up', hue: 200 }, // Economics
  ECO: { icon: 'trending-up', hue: 200 },
  FIL: { icon: 'film', hue: 280 },
  FIN: { icon: 'cash', hue: 130 }, // Finance
  IB: { icon: 'globe', hue: 210 },
  MGT: { icon: 'people-circle', hue: 260 }, // Management
  MKT: { icon: 'megaphone', hue: 340 }, // Marketing
  MQM: { icon: 'bar-chart', hue: 200 },

  // Computing / tech
  CSC: { icon: 'code-slash', hue: 220 }, // Computer Science
  CS: { icon: 'code-slash', hue: 220 },
  IT: { icon: 'terminal', hue: 230 }, // Information Technology
  ITK: { icon: 'terminal', hue: 230 },
  CIS: { icon: 'desktop', hue: 220 },

  // Math / quantitative
  MAT: { icon: 'calculator-outline', hue: 250 },
  MATH: { icon: 'calculator-outline', hue: 250 },
  STT: { icon: 'pie-chart', hue: 270 }, // Statistics

  // Sciences
  AST: { icon: 'planet', hue: 240 }, // Astronomy
  BIO: { icon: 'leaf', hue: 130 },
  BSC: { icon: 'leaf', hue: 130 },
  CHE: { icon: 'flask', hue: 200 }, // Chemistry
  CHEM: { icon: 'flask', hue: 200 },
  ENV: { icon: 'earth', hue: 145 },
  GEO: { icon: 'earth', hue: 145 },
  PHY: { icon: 'magnet', hue: 220 }, // Physics
  PHYS: { icon: 'magnet', hue: 220 },

  // Health / nursing
  NUR: { icon: 'medkit', hue: 350 },
  HSC: { icon: 'fitness', hue: 350 }, // Health Sciences
  KNR: { icon: 'barbell', hue: 18 }, // Kinesiology

  // Humanities / arts
  ART: { icon: 'color-palette', hue: 330 },
  ENG: { icon: 'book', hue: 30 }, // English
  HIS: { icon: 'library', hue: 30 }, // History
  LIB: { icon: 'library', hue: 30 },
  MUS: { icon: 'musical-notes', hue: 290 },
  PHI: { icon: 'bulb', hue: 50 }, // Philosophy
  REL: { icon: 'flower', hue: 50 },
  THE: { icon: 'mic', hue: 320 }, // Theatre

  // Social sciences / education
  ANT: { icon: 'people', hue: 30 }, // Anthropology
  COM: { icon: 'chatbubbles', hue: 200 }, // Communication
  CRJ: { icon: 'shield-checkmark', hue: 220 }, // Criminal Justice
  EAF: { icon: 'school', hue: 220 }, // Education
  EDU: { icon: 'school', hue: 220 },
  POL: { icon: 'flag', hue: 0 }, // Political Science
  PSY: { icon: 'happy', hue: 280 }, // Psychology
  SOA: { icon: 'people', hue: 30 },
  SOC: { icon: 'people', hue: 30 }, // Sociology
  SWK: { icon: 'heart', hue: 350 }, // Social Work

  // Languages
  FRE: { icon: 'language', hue: 230 },
  GER: { icon: 'language', hue: 230 },
  SPA: { icon: 'language', hue: 230 },

  // Family / agriculture
  AGR: { icon: 'nutrition', hue: 130 },
  FCS: { icon: 'home', hue: 32 }, // Family & Consumer Sciences
  TEC: { icon: 'construct', hue: 35 }, // Technology
};

const FALLBACK: CourseVisual = { icon: 'book-outline', hue: 350 };

/**
 * Extract the subject prefix from a course code (e.g. "ACC131" → "ACC").
 * Tolerates spaces, mixed casing, and codes like "IT-326".
 */
export function subjectFromCode(courseCode: string | undefined | null): string {
  if (!courseCode) return '';
  const match = courseCode.toUpperCase().match(/^[A-Z]+/);
  return match ? match[0] : '';
}

export function getCourseVisual(courseCode: string | undefined | null): CourseVisual {
  const subject = subjectFromCode(courseCode);
  return SUBJECT_VISUALS[subject] ?? FALLBACK;
}

/**
 * Derive a subtle background and a stronger foreground from the subject hue.
 * Saturation/lightness are tuned to read on both light and dark themes.
 */
export function visualColors(visual: CourseVisual): {
  background: string;
  border: string;
  foreground: string;
} {
  const h = visual.hue;
  return {
    background: `hsla(${h}, 70%, 55%, 0.16)`,
    border: `hsla(${h}, 70%, 55%, 0.30)`,
    foreground: `hsl(${h}, 65%, 50%)`,
  };
}
