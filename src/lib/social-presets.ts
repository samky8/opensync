export const socialBackgrounds = ['botanical', 'sunset', 'waves', 'arches'] as const;

export type SocialStyle = {
  background?: string;
  customImage?: string;
  headerText?: string;
  showHeaderText?: boolean;
  showBusinessName?: boolean;
  showBusinessLogo?: boolean;
  footer?: string;
  fontColour?: string;
  theme: 'cream' | 'dark' | 'accent';
  accent: string;
};

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
