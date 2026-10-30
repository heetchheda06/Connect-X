// Curated ocean-friendly gradient palettes for avatar generation
export const AVATAR_PALETTES = [
  { name: 'blue-teal', from: '#0A6BD6', to: '#0EA5C6' },
  { name: 'teal-mint', from: '#0EA5C6', to: '#14C8A8' },
  { name: 'sky-indigo', from: '#0284C7', to: '#4F46E5' },
  { name: 'coral-peach', from: '#FF7A59', to: '#F59E0B' },
  { name: 'seagreen-lime', from: '#0D9488', to: '#84CC16' },
];

export const getAvatarPalette = (identifier = '') => {
  let hash = 0;
  const str = String(identifier);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
};

export const getInitials = (name = '') => {
  if (!name) return 'CX';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

