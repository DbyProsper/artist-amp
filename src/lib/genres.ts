export const DISCOVER_GENRES = [
  'Amapiano', 'R&B', 'Hip-Hop', 'Trap', 'Lekompo', 'Gospel', 'Afrobeats', 'Pop',
] as const;

export const MUSIC_GENRES = [
  ...DISCOVER_GENRES,
  'Afrosoul', 'Gqom', 'Maskandi', 'Kwaito', 'House', 'Soul', 'Jazz',
  'Reggae', 'Rock', 'Electronic', 'Indie', 'Classical', 'Country',
  'Dancehall', 'Lo-Fi',
] as const;

export function canonicalGenre(value?: string | null) {
  const normalised = (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalised === 'rnb' || normalised === 'rhythmandblues') return 'R&B';
  if (normalised === 'hiphop') return 'Hip-Hop';
  return MUSIC_GENRES.find(genre => genre.toLowerCase().replace(/[^a-z0-9]/g, '') === normalised) || value?.trim() || '';
}

export function genreMatches(left?: string | null, right?: string | null) {
  return canonicalGenre(left).toLowerCase() === canonicalGenre(right).toLowerCase();
}
