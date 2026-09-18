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
  credits?: MusicCredits;
  visualFilter?: string;
  attachedMusic?: string;
}

export interface MusicCredits {
  primaryArtist?: string;
  featuredArtists?: string[];
  writers?: string[];
  composers?: string[];
  producers?: string[];
  engineers?: string[];
  label?: string;
  releaseType?: 'single' | 'ep' | 'album' | 'mixtape' | 'demo';
}

export interface Post {
  id: string;
  artist: Artist;
  type: 'audio' | 'video' | 'image';
  track?: Track;
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
