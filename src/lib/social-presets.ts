export const socialBackgrounds = ['botanical', 'sunset', 'waves', 'arches'] as const;

export const socialFonts = {
  classic: 'Classic (serif headings)',
  sans: 'Arial',
  serif: 'Georgia',
  mono: 'Courier New',
} as const;

export const socialTextSize = { min: 60, max: 150, default: 100 };

export type SocialStyle = {
  background?: string;
  customImage?: string;
  headerText?: string;
  showHeaderText?: boolean;
  showBusinessName?: boolean;
  showBusinessLogo?: boolean;
  footer?: string;
  fontColour?: string;
  font?: keyof typeof socialFonts;
  titleSize?: number;
  bodySize?: number;
  alignment?: 'left' | 'center' | 'right';
  showFrame?: boolean;
  showFooter?: boolean;
  theme: 'cream' | 'dark' | 'accent';
  accent: string;
};

export const quickSocialPresets = [
  { name: 'Classic', style: { theme: 'cream', font: 'classic', showFrame: true } },
  {
    name: 'Modern',
    style: { theme: 'cream', font: 'sans', showFrame: false, alignment: 'left', bodySize: 115 },
  },
  {
    name: 'Bold',
    style: { theme: 'accent', font: 'sans', showFrame: false, alignment: 'center', titleSize: 140 },
  },
  {
    name: 'Midnight',
    style: { theme: 'dark', font: 'serif', showFrame: true, alignment: 'center', titleSize: 115 },
  },
] satisfies { name: string; style: Partial<SocialStyle> }[];

export function socialPalette(style: SocialStyle) {
  const accent = Number.parseInt(style.accent.slice(1), 16);
  const dark =
    style.theme === 'dark' ||
    (style.theme === 'accent' &&
      ((accent >> 16) & 255) * 0.299 + ((accent >> 8) & 255) * 0.587 + (accent & 255) * 0.114 <
        150);
  return {
    dark,
    background: style.theme === 'accent' ? style.accent : dark ? '#182b27' : '#faf5eb',
    ink: dark ? '#faf5eb' : '#152823',
    frame: dark ? '#52645e' : '#b5b0a5',
  };
}

export function socialCanvasFont(font: SocialStyle['font'], size: number, bold: boolean) {
  const family = {
    classic: bold ? 'Georgia' : 'Arial',
    sans: 'Arial',
    serif: 'Georgia',
    mono: '"Courier New"',
  };
  return `${bold ? 600 : 400} ${size}px ${family[font ?? 'classic'] ?? family.classic}`;
}

export function scaledSocialText(base: number, percent?: number) {
  const scale =
    typeof percent === 'number' && Number.isFinite(percent)
      ? Math.min(socialTextSize.max, Math.max(socialTextSize.min, percent))
      : socialTextSize.default;
  return Math.round((base * scale) / 100);
}

export type SocialPreset = {
  id: string;
  name: string;
  style: SocialStyle;
};

export const socialPresetStorageKey = (locationId: string) =>
  `opensync-social-presets-v1:${locationId}`;

export function socialStyle<T extends SocialStyle>(design: T): SocialStyle {
  return {
    background: design.background,
    customImage: design.customImage,
    headerText: design.headerText,
    showHeaderText: design.showHeaderText,
    showBusinessName: design.showBusinessName,
    showBusinessLogo: design.showBusinessLogo,
    footer: design.footer,
    fontColour: design.fontColour,
    font: design.font,
    titleSize: design.titleSize,
    bodySize: design.bodySize,
    alignment: design.alignment,
    showFrame: design.showFrame,
    showFooter: design.showFooter,
    theme: design.theme,
    accent: design.accent,
  };
}

export function readSocialPresets(locationId: string): SocialPreset[] {
  try {
    const value = JSON.parse(localStorage.getItem(socialPresetStorageKey(locationId)) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(
      (preset): preset is SocialPreset =>
        preset &&
        typeof preset.id === 'string' &&
        typeof preset.name === 'string' &&
        preset.name.trim().length > 0 &&
        preset.style &&
        ['cream', 'dark', 'accent'].includes(preset.style.theme) &&
        /^#[a-f\d]{6}$/i.test(preset.style.accent),
    );
  } catch {
    return [];
  }
}

export function writeSocialPresets(locationId: string, presets: SocialPreset[]) {
  localStorage.setItem(socialPresetStorageKey(locationId), JSON.stringify(presets));
}
