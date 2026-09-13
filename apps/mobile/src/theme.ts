export interface AppTheme {
  isDark: boolean;
  colors: {
    bg: string;
    surface: string;
    surfaceSecondary: string;
    surfaceMuted: string;
    border: string;
    borderFocus: string;

    textPrimary: string;
    textSecondary: string;
    textMuted: string;

    protein: string;
    proteinBg: string;
    carbs: string;
    carbsBg: string;
    fat: string;
    fatBg: string;
    calories: string;

    accent: string;
    accentText: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
}

const sharedRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const lightTheme: AppTheme = {
  isDark: false,
  colors: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F5F9',
    surfaceMuted: '#E2E8F0',
    border: '#E2E8F0',
    borderFocus: '#0F172A',

    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',

    protein: '#DC2626',
    proteinBg: '#FEF2F2',
    carbs: '#D97706',
    carbsBg: '#FFFBEB',
    fat: '#059669',
    fatBg: '#ECFDF5',
    calories: '#0F172A',

    accent: '#0F172A',
    accentText: '#FFFFFF',
  },
  radius: sharedRadius,
};

export const darkTheme: AppTheme = {
  isDark: true,
  colors: {
    // Deep obsidian-slate canvas (warm, blended, never pure pitch black)
    bg: '#0D1117',
    surface: '#161B22',
    surfaceSecondary: '#21262D',
    surfaceMuted: '#30363D',
    border: '#282E37',
    borderFocus: '#58A6FF',

    // Soft ink hierarchy that prevents eye strain
    textPrimary: '#F0F6FC',
    textSecondary: '#8B949E',
    textMuted: '#6E7681',

    // Muted, harmonized macro tones (tinted at 12% opacity)
    protein: '#F87171',          // Soft terracotta coral
    proteinBg: 'rgba(248, 113, 113, 0.12)',
    carbs: '#FBBF24',            // Soft warm amber
    carbsBg: 'rgba(251, 191, 36, 0.12)',
    fat: '#34D399',              // Soft herbal sage
    fatBg: 'rgba(52, 211, 153, 0.12)',
    calories: '#F0F6FC',

    accent: '#F0F6FC',
    accentText: '#0D1117',
  },
  radius: sharedRadius,
};