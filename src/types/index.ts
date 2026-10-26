export interface Artist {
  id: string;
  name: string;
  username: string;
  avatar: string;
  coverImage: string;
  bio: string;
  location: string;
  genres: string[];
  isVerified: boolean;
  followers: number;
  following: number;
  tracks: number;
  socialLinks?: {
    youtube?: string;
    spotify?: string;
    appleMusic?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
  };
}

export interface Track {
  id: string;
  title: string;
  artist: Artist;
  coverArt: string;
  duration: number;
  plays: number;
  likes: number;
  audioUrl?: string;
  lyrics?: string;
  timestampedLyrics?: Array<{
    text: string;
    startTime: number;
    endTime: number;
  }>;
  lyricStartTime?: number;
  credits?: MusicCredits;
  visualFilter?: string;
  attachedMusic?: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  energy?: number;
  loudness?: number;
  tags?: string[];
  storagePath?: string;
  source?: 'firestore' | 'gcs' | 'generated' | 'demo';
  isPublic?: boolean;
  createdAt?: Date;
  albumId?: string;
  trackNumber?: number;
}

export interface Album {
  id: string;
  title: string;
  type: 'album' | 'ep';
  artist: Artist;
  coverArt: string;
  genre?: string;
  description?: string;
  tracks: Track[];
  releaseDate?: Date;
}

export interface MusicCredits {
  primaryArtist?: string;
  featuredArtists?: string[];
  writers?: string[];
  composers?: string[];
  producers?: string[];
  engineers?: string[];
  label?: string;
  promptBy?: string;
  generatedBy?: string;
  locked?: boolean;
  releaseType?: 'single' | 'ep' | 'album' | 'mixtape' | 'demo';
}

export interface Post {
  id: string;
  artist: Artist;
  type: 'audio' | 'video' | 'image' | 'album';
  track?: Track;
  album?: Album;
  imageUrl?: string;
  videoUrl?: string;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  createdAt: Date;
  isLiked?: boolean;
  isSaved?: boolean;
  isNewRelease?: boolean;
  isNewPost?: boolean;
  credits?: MusicCredits;
  visualFilter?: string;
  attachedMusic?: string;
  ctaLabel?: string;
  ctaTarget?: string;
  hideLikes?: boolean;
  hidePlayCount?: boolean;
}

export interface Story {
  id: string;
  artist: Artist;
  imageUrl: string;
  viewed: boolean;
  videoUrl?: string;
  caption?: string;
  attachedMusic?: string;
  createdAt?: Date;
  clipStart?: number;
  clipEnd?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  tracks: Track[];
  creator: Artist;
  followers: number;
  isPublic: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'collab';
  fromUser: Artist;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface SocialLinks {
  youtube?: string;
  spotify?: string;
  appleMusic?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
}
