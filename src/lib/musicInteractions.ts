import type { CommercialVideo, MusicPlaylist, MusicTrack } from "@/types/music";

export type MusicView = "home" | "search" | "library" | "liked" | "playlist";
export type SearchSuggestion = {
  id: string;
  label: string;
  detail: string;
  query: string;
  type: "track" | "artist" | "playlist" | "related" | "audius" | "official" | "recent";
};

export function previousMusicView(view: MusicView): MusicView {
  return view === "home" ? "home" : "home";
}

export function genreSearchValue(genre: string) {
  return genre.trim();
}

export function nextPreviewVolume(volume: number) {
  return volume > 0 ? 0 : 1;
}

export function preferAvailableTracks<T>(providerTracks: T[] | undefined, fallbackTracks: T[]) {
  return providerTracks?.length ? providerTracks : fallbackTracks;
}

export function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

export function addRecentSearch(recentSearches: string[], query: string, limit = 6) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return recentSearches;
  return [normalized, ...recentSearches.filter(item => item.localeCompare(normalized, undefined, { sensitivity: "accent" }) !== 0)].slice(0, limit);
}

export function recentSearchSuggestions(recentSearches: string[]): SearchSuggestion[] {
  return recentSearches.map(query => ({ id: `recent:${query.toLocaleLowerCase()}`, label: query, detail: "Search again", query, type: "recent" }));
}

export function buildSearchSuggestions(query: string, tracks: MusicTrack[], playlists: MusicPlaylist[], audiusTracks: MusicTrack[] = [], officialVideos: CommercialVideo[] = []): SearchSuggestion[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];

  const suggestions: Array<SearchSuggestion & { score: number }> = [];
  const add = (suggestion: SearchSuggestion, score: number) => {
    if (!suggestions.some(item => item.id === suggestion.id)) suggestions.push({ ...suggestion, score });
  };

  tracks.forEach(track => {
    const title = track.title.toLocaleLowerCase();
    const artist = track.artist.toLocaleLowerCase();
    if (title.includes(normalized) || artist.includes(normalized) || track.album.toLocaleLowerCase().includes(normalized)) {
      add({ id: `track:${track.id}`, label: track.title, detail: `${track.artist} · Track`, query: track.title, type: "track" }, title.startsWith(normalized) ? 100 : artist.startsWith(normalized) ? 90 : 70);
    }
    if (artist.includes(normalized)) {
      add({ id: `artist:${artist}`, label: track.artist, detail: "Artist", query: track.artist, type: "artist" }, artist.startsWith(normalized) ? 95 : 75);
    }
  });

  playlists.forEach(playlist => {
    const title = playlist.title.toLocaleLowerCase();
    const description = (playlist.description ?? "").toLocaleLowerCase();
    if (title.includes(normalized) || description.includes(normalized)) {
      add({ id: `playlist:${playlist.id}`, label: playlist.title, detail: "Playlist", query: playlist.title, type: "playlist" }, title.startsWith(normalized) ? 85 : 60);
    }
  });

  audiusTracks.forEach(track => {
    const title = track.title.toLocaleLowerCase();
    const artist = track.artist.toLocaleLowerCase();
    if (title.includes(normalized) || artist.includes(normalized)) {
      add({ id: `audius:${track.id}`, label: track.title, detail: `${track.artist} · Audius stream`, query: track.title, type: "audius" }, title.startsWith(normalized) ? 98 : 78);
    }
  });

  officialVideos.forEach(video => {
    const title = video.title.toLocaleLowerCase();
    const channel = video.channelTitle.toLocaleLowerCase();
    if (title.includes(normalized) || channel.includes(normalized)) {
      add({ id: `official:${video.id}`, label: video.title, detail: `${video.channelTitle} · Official YouTube`, query: video.title, type: "official" }, title.startsWith(normalized) ? 96 : 76);
    }
  });

  ["Bollywood", "Bhojpuri", "Punjabi", "Tamil", "Hindi hits", "International pop", "Lo-fi beats"].forEach(term => {
    const comparable = term.toLocaleLowerCase();
    if (comparable.includes(normalized) || normalized.includes(comparable)) {
      add({ id: `related:${comparable}`, label: term, detail: "Related search", query: term, type: "related" }, 80);
    }
  });

  return suggestions
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, 8)
    .map(({ score: _score, ...suggestion }) => suggestion);
}
