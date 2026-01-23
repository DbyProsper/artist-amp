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
}

export interface Story {
  id: string;
  artist: Artist;
  imageUrl: string;
  viewed: boolean;
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
