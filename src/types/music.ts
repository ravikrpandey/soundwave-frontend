export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  genre: string;
  coverTone: string;
  coverAccent: string;
  audioUrl?: string | null;
  source?: "demo" | "audius";
};

export type MusicPlaylist = {
  id: number;
  title: string;
  description?: string | null;
  coverTone: string;
  coverAccent: string;
  kind?: "curated" | "user";
  tracks: MusicTrack[];
};

export type CommercialVideo = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  provider: "youtube";
};
