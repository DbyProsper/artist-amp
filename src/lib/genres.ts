export const DISCOVER_GENRES = [
  'Amapiano', 'R&B', 'Hip-Hop', 'Trap', 'Lekompo', 'Gospel', 'Afrobeats', 'Pop',
  'Melodic Trap', 'Psychedelic R&B', 'TrapSoul',
] as const;

export const MUSIC_GENRES = [
  ...DISCOVER_GENRES,
  'Afrosoul', 'Gqom', 'Maskandi', 'Kwaito', 'House', 'Soul', 'Jazz',
  'Reggae', 'Rock', 'Electronic', 'Indie', 'Classical', 'Country',
  'Dancehall', 'Lo-Fi',
] as const;

export const MUSIC_SUBGENRES = [
  'Melodic Trap', 'TrapSoul', 'Psychedelic R&B', 'Alternative R&B', 'Contemporary R&B',
  'Afro Trap', 'Drill', 'Boom Bap', 'Conscious Hip-Hop', 'Cloud Rap', 'Gospel Trap',
  'Private School Amapiano', 'Vocal Amapiano', 'Tech Amapiano', 'Bacardi', 'Afro House',
  'Deep House', 'Soulful House', 'Afro Pop', 'Afro Soul', 'Indie Pop', 'Synth Pop',
  'Pop Rock', 'Alternative Rock', 'Indie Rock', 'Neo Soul', 'Lo-Fi Hip-Hop',
] as const;

const SUBGENRES_BY_GENRE: Record<string, readonly string[]> = {
  'R&B': ['Psychedelic R&B', 'Alternative R&B', 'Contemporary R&B', 'TrapSoul'],
  Trap: ['Melodic Trap', 'TrapSoul', 'Afro Trap', 'Drill', 'Cloud Rap'],
  'Hip-Hop': ['Melodic Trap', 'TrapSoul', 'Drill', 'Boom Bap', 'Conscious Hip-Hop', 'Cloud Rap'],
  Amapiano: ['Private School Amapiano', 'Vocal Amapiano', 'Tech Amapiano', 'Bacardi'],
  Gospel: ['Gospel Trap', 'Contemporary Gospel'],
  House: ['Afro House', 'Deep House', 'Soulful House'],
  Afrobeats: ['Afro Pop', 'Afro Soul', 'Afro Trap'],
  Pop: ['Afro Pop', 'Indie Pop', 'Synth Pop', 'Pop Rock'],
  Rock: ['Pop Rock', 'Alternative Rock', 'Indie Rock'],
  Soul: ['Neo Soul', 'Afro Soul'],
  'Lo-Fi': ['Lo-Fi Hip-Hop'],
};

export function subgenresForGenre(genre?: string | null): readonly string[] {
  return SUBGENRES_BY_GENRE[canonicalGenre(genre)] ?? MUSIC_SUBGENRES;
}

export function canonicalGenre(value?: string | null) {
  const normalised = (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalised === 'rnb' || normalised === 'rhythmandblues') return 'R&B';
  if (normalised === 'hiphop') return 'Hip-Hop';
  return MUSIC_GENRES.find(genre => genre.toLowerCase().replace(/[^a-z0-9]/g, '') === normalised) || value?.trim() || '';
}

export function genreMatches(left?: string | null, right?: string | null) {
  return canonicalGenre(left).toLowerCase() === canonicalGenre(right).toLowerCase();
}
