import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import MusicArtwork from "@/components/MusicArtwork";
import LoginDialog from "@/components/LoginDialog";
import OfficialVideoPlayer from "@/components/OfficialVideoPlayer";
import TrackRow from "@/components/TrackRow";
import { usePlayer } from "@/contexts/PlayerContext";
import { addRecentSearch, buildSearchSuggestions, genreSearchValue, MusicView, nextPreviewVolume, normalizeSearchQuery, preferAvailableTracks, previousMusicView, recentSearchSuggestions, SearchSuggestion } from "@/lib/musicInteractions";
import { trpc } from "@/lib/trpc";
import { CommercialVideo, MusicPlaylist, MusicTrack } from "@/types/music";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Heart,
  Home as HomeIcon,
  Library,
  ListMusic,
  Loader2,
  LogOut,
  Pause,
  Play,
  Plus,
  Repeat2,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type View = MusicView;
const RECENT_SEARCHES_STORAGE_KEY = "soundwave-recent-searches-v1";

function loadRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string").map(normalizeSearchQuery).filter(Boolean).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds % 60)).padStart(2, "0")}`;
}

function SidebarLogo() {
  return (
    <div className="brand" aria-label="Soundwave home">
      <span className="brand__glyph"><i /><i /><i /></span>
      <span>soundwave</span>
    </div>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><Sparkles size={24} /><h2>{title}</h2><p>{description}</p>{action}</div>;
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [view, setView] = useState<View>("home");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [queueOpen, setQueueOpen] = useState(false);
  const [playlistDialog, setPlaylistDialog] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState<MusicTrack | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [activeCommercialVideo, setActiveCommercialVideo] = useState<CommercialVideo | null>(null);
  const [loginDialog, setLoginDialog] = useState(false);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const searchControlRef = useRef<HTMLDivElement>(null);
  const player = usePlayer();
  const catalogQuery = trpc.catalog.home.useQuery();
  const audiusTrendingQuery = trpc.catalog.audiusTrending.useQuery(undefined, { retry: 1 });
  const libraryQuery = trpc.library.get.useQuery(undefined, { enabled: isAuthenticated });
  const searchInput = useMemo(() => ({ query: debouncedSearch }), [debouncedSearch]);
  const searchQuery = trpc.catalog.search.useQuery(searchInput, {
    enabled: view === "search" && debouncedSearch.trim().length > 0,
  });
  const audiusSearchQuery = trpc.catalog.audiusSearch.useQuery(searchInput, {
    enabled: view === "search" && debouncedSearch.trim().length > 0,
    retry: 1,
  });
  const youtubeSearchQuery = trpc.catalog.youtubeSearch.useQuery(searchInput, {
    enabled: view === "search" && debouncedSearch.trim().length > 0,
    retry: 1,
  });
  const toggleLikeMutation = trpc.library.toggleLike.useMutation({
    onSuccess: () => void libraryQuery.refetch(),
    onError: () => toast.error("We could not update your liked tracks."),
  });
  const createPlaylistMutation = trpc.library.createPlaylist.useMutation({
    onSuccess: (playlist: { id?: number } | undefined) => {
      void libraryQuery.refetch();
      setPlaylistDialog(false);
      setPlaylistTitle("");
      setPlaylistDescription("");
      if (playlist?.id) openPlaylist(playlist.id);
      toast.success("Playlist created");
    },
    onError: () => toast.error("We could not create that playlist."),
  });
  const addTrackMutation = trpc.library.addTrack.useMutation({
    onSuccess: () => {
      void libraryQuery.refetch();
      setTrackToAdd(null);
      toast.success("Added to playlist");
    },
    onError: () => toast.error("We could not add that track."),
  });
  const removeTrackMutation = trpc.library.removeTrack.useMutation({
    onSuccess: () => {
      void libraryQuery.refetch();
      toast.success("Removed from playlist");
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchText), 120);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const query = normalizeSearchQuery(debouncedSearch);
    if (!query) return;
    setRecentSearches(current => {
      const next = addRecentSearch(current, query);
      window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [debouncedSearch]);

  useEffect(() => {
    if (!searchSuggestionsOpen) return;
    const dismissOnOutsidePointerDown = (event: PointerEvent) => {
      if (searchControlRef.current && !searchControlRef.current.contains(event.target as Node)) setSearchSuggestionsOpen(false);
    };
    document.addEventListener("pointerdown", dismissOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", dismissOnOutsidePointerDown);
  }, [searchSuggestionsOpen]);

  const catalogTracks = (catalogQuery.data?.tracks ?? []) as MusicTrack[];
  const audiusTracks = (audiusTrendingQuery.data ?? []) as MusicTrack[];
  const homeTracks = preferAvailableTracks(audiusTracks, catalogTracks);
  const curatedPlaylists = (catalogQuery.data?.playlists ?? []) as MusicPlaylist[];
  const likedTracks = (libraryQuery.data?.likedTracks ?? []) as MusicTrack[];
  const userPlaylists = (libraryQuery.data?.playlists ?? []) as MusicPlaylist[];
  const allPlaylists = [...curatedPlaylists, ...userPlaylists];
  const localSearchTracks = (searchQuery.data?.tracks ?? []) as MusicTrack[];
  const audiusSearchTracks = (audiusSearchQuery.data ?? []) as MusicTrack[];
  const resultTracks = preferAvailableTracks(audiusSearchTracks, localSearchTracks);
  const resultPlaylists = (searchQuery.data?.playlists ?? []) as MusicPlaylist[];
  const commercialSearch = youtubeSearchQuery.data;
  const commercialVideos = (commercialSearch?.videos ?? []) as CommercialVideo[];
  const commercialAvailability = commercialSearch?.availability ?? "available";
  const searchSuggestions = useMemo(() => buildSearchSuggestions(searchText, catalogTracks, allPlaylists, audiusSearchTracks, commercialVideos), [searchText, catalogTracks, allPlaylists, audiusSearchTracks, commercialVideos]);
  const visibleSearchSuggestions = searchText.trim() ? searchSuggestions : recentSearchSuggestions(recentSearches);
  const activePlaylist = allPlaylists.find(playlist => playlist.id === selectedPlaylistId);
  const likedIds = new Set(likedTracks.map(track => track.id));
  const currentList = activePlaylist?.tracks ?? homeTracks;

  function openPlaylist(id: number) {
    setSelectedPlaylistId(id);
    setView("playlist");
    setQueueOpen(false);
  }

  function switchView(nextView: View) {
    setView(nextView);
    if (nextView === "search") setSearchText("");
    setSearchSuggestionsOpen(false);
    setQueueOpen(false);
  }

  function handleBack() {
    const previousView = previousMusicView(view);
    if (previousView === view) {
      toast.message("You are already at the start of Soundwave.");
      return;
    }
    switchView(previousView);
  }

  function handleForward() {
    toast.message("Choose a playlist, search result, or library view to keep exploring.");
  }

  function filterByGenre(genre: string) {
    const value = genreSearchValue(genre);
    setSearchText(value);
    setDebouncedSearch(value);
    setSearchSuggestionsOpen(false);
  }

  function selectSearchSuggestion(suggestion: SearchSuggestion) {
    setSearchText(suggestion.query);
    setDebouncedSearch(suggestion.query);
    setSearchSuggestionsOpen(false);
  }

  function clearRecentSearches() {
    setRecentSearches([]);
    window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    setSearchSuggestionsOpen(false);
  }

  function requireSignIn(action: () => void) {
    if (!isAuthenticated) {
      toast.message("Sign in with Google to save music to your library.");
      setLoginDialog(true);
      return;
    }
    action();
  }

  function handleGoogleSignIn() {
    void startLogin().catch(() => {
      toast.error("Google sign-in could not start. Please try again.");
    });
  }

  function toggleLike(track: MusicTrack) {
    requireSignIn(() => toggleLikeMutation.mutate({ track }));
  }

  function addToPlaylist(track: MusicTrack) {
    requireSignIn(() => setTrackToAdd(track));
  }

  function createPlaylist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!playlistTitle.trim()) return;
    createPlaylistMutation.mutate({ title: playlistTitle.trim(), description: playlistDescription.trim() || undefined });
  }

  function playTrack(track: MusicTrack, list = currentList) {
    player.playTrack(track, list);
  }

  const isLoading = catalogQuery.isLoading;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <SidebarLogo />
        <nav className="sidebar__nav" aria-label="Primary navigation">
          <button className={view === "home" ? "nav-link nav-link--active" : "nav-link"} onClick={() => switchView("home")}><HomeIcon size={19} />Home</button>
          <button className={view === "search" ? "nav-link nav-link--active" : "nav-link"} onClick={() => switchView("search")}><Search size={19} />Search</button>
          <button className={view === "library" ? "nav-link nav-link--active" : "nav-link"} onClick={() => switchView("library")}><Library size={19} />Your Library</button>
        </nav>
        <div className="sidebar__split" />
        <button className="create-playlist" onClick={() => requireSignIn(() => setPlaylistDialog(true))}><CirclePlus size={20} />Create playlist</button>
        <button className={view === "liked" ? "liked-link liked-link--active" : "liked-link"} onClick={() => switchView("liked")}><span><Heart size={16} fill="currentColor" /></span>Liked Songs</button>
        <div className="playlist-nav-label">Your playlists</div>
        <div className="sidebar__playlists">
          {isAuthenticated && userPlaylists.length === 0 && <p className="sidebar__hint">Your saved playlists will appear here.</p>}
          {!isAuthenticated && <p className="sidebar__hint">Sign in to build your library.</p>}
          {userPlaylists.map(playlist => <button key={playlist.id} onClick={() => openPlaylist(playlist.id)}>{playlist.title}</button>)}
        </div>
        <div className="sidebar__account">
          {isAuthenticated ? <><span className="avatar">{(user?.name ?? "U").slice(0, 1).toUpperCase()}</span><span className="sidebar__account-name">{user?.name ?? "Listener"}</span><button aria-label="Log out" className="icon-button" onClick={() => void logout()}><LogOut size={16} /></button></> : <button className="sign-in-button" onClick={() => setLoginDialog(true)}>Continue with Google</button>}
        </div>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div className="history-buttons"><button aria-label="Go back" className="round-control" onClick={handleBack}><ChevronLeft size={19} /></button><button aria-label="Go forward" className="round-control round-control--muted" onClick={handleForward}><ChevronRight size={19} /></button></div>
          {view === "search" && <div ref={searchControlRef} className="search-control"><label className="search-field"><Search size={18} /><input autoFocus aria-label="Search tracks, artists, or playlists" value={searchText} onFocus={() => setSearchSuggestionsOpen(true)} onKeyDown={event => { if (event.key === "Escape") setSearchSuggestionsOpen(false); }} onChange={event => { setSearchText(event.target.value); setSearchSuggestionsOpen(true); }} placeholder="What do you want to listen to?" /><button aria-label="Clear search" className={searchText ? "clear-search" : "clear-search clear-search--hidden"} onClick={() => { setSearchText(""); setDebouncedSearch(""); setSearchSuggestionsOpen(false); }}><X size={16} /></button></label><SearchSuggestions suggestions={searchSuggestionsOpen ? visibleSearchSuggestions : []} onSelect={selectSearchSuggestion} onClearRecent={clearRecentSearches} /></div>}
          {view !== "search" && <p className="topbar__crumb">{view === "home" ? "Good evening" : view === "liked" ? "Your collection" : view === "library" ? "Your library" : activePlaylist?.title}</p>}
          <div className="topbar__actions"><button className="queue-toggle" onClick={() => setQueueOpen(open => !open)}><ListMusic size={18} /><span>Queue</span>{player.queue.length > 0 && <b>{player.queue.length}</b>}</button><button className="profile-chip" onClick={isAuthenticated ? () => switchView("library") : () => setLoginDialog(true)}><span>{isAuthenticated ? (user?.name ?? "U").slice(0, 1).toUpperCase() : "G"}</span><strong>{isAuthenticated ? (user?.name ?? "Listener") : "Google sign-in"}</strong></button></div>
        </header>

        <section className="page-scroll">
          {isLoading && <div className="loading-state"><Loader2 className="spin" size={24} />Loading your sound…</div>}
          {!isLoading && catalogQuery.isError && <EmptyState title="The catalog is taking a breath." description="Refresh to reconnect to the Soundwave collection." action={<button className="primary-button" onClick={() => void catalogQuery.refetch()}>Try again</button>} />}
          {!isLoading && !catalogQuery.isError && view === "home" && <HomeView tracks={homeTracks} playlists={curatedPlaylists} likedIds={likedIds} onPlay={playTrack} onOpenPlaylist={openPlaylist} onLike={toggleLike} onAdd={addToPlaylist} onShowAll={() => switchView("search")} liveCatalog={audiusTracks.length > 0} />}
          {!isLoading && !catalogQuery.isError && view === "search" && <SearchView query={debouncedSearch} tracks={resultTracks} playlists={resultPlaylists} commercialVideos={commercialVideos} commercialAvailability={commercialAvailability} likedIds={likedIds} onPlay={playTrack} onOpenPlaylist={openPlaylist} onLike={toggleLike} onAdd={addToPlaylist} onFilterGenre={filterByGenre} onPlayCommercial={setActiveCommercialVideo} />}
          {!isLoading && !catalogQuery.isError && view === "library" && <LibraryView authenticated={isAuthenticated} playlists={userPlaylists} likedCount={likedTracks.length} onLogin={() => setLoginDialog(true)} onOpenLiked={() => switchView("liked")} onOpenPlaylist={openPlaylist} onCreate={() => setPlaylistDialog(true)} />}
          {!isLoading && !catalogQuery.isError && view === "liked" && <LikedView authenticated={isAuthenticated} tracks={likedTracks} likedIds={likedIds} onLogin={() => setLoginDialog(true)} onPlay={playTrack} onLike={toggleLike} onAdd={addToPlaylist} />}
          {!isLoading && !catalogQuery.isError && view === "playlist" && <PlaylistView playlist={activePlaylist} likedIds={likedIds} currentTrackId={player.currentTrack?.id} isPlaying={player.isPlaying} onBack={() => switchView("home")} onPlay={playTrack} onLike={toggleLike} onAdd={addToPlaylist} onRemove={track => activePlaylist?.kind === "user" && removeTrackMutation.mutate({ playlistId: activePlaylist.id, trackId: track.id })} />}
        </section>
      </main>

      {activeCommercialVideo && <OfficialVideoPlayer video={activeCommercialVideo} videos={commercialVideos.length ? commercialVideos : [activeCommercialVideo]} onSelect={setActiveCommercialVideo} onClose={() => setActiveCommercialVideo(null)} />}

      <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
      <MobileNav current={view} onChange={switchView} />
      <PlayerBar onQueue={() => setQueueOpen(open => !open)} />
      <LoginDialog open={loginDialog} onOpenChange={setLoginDialog} onGoogleSignIn={handleGoogleSignIn} />

      {(playlistDialog || trackToAdd) && <div className="modal-scrim" role="presentation" onMouseDown={() => { setPlaylistDialog(false); setTrackToAdd(null); }}><div className="music-modal" role="dialog" aria-modal="true" aria-labelledby="playlist-modal-title" onMouseDown={event => event.stopPropagation()}>
        <button aria-label="Close" className="modal-close" onClick={() => { setPlaylistDialog(false); setTrackToAdd(null); }}><X size={19} /></button>
        {trackToAdd ? <><p className="eyebrow">Add to playlist</p><h2 id="playlist-modal-title">Save “{trackToAdd.title}”</h2><p className="modal-copy">Choose a playlist from your library, or create a new one.</p><div className="playlist-picker">{userPlaylists.map(playlist => <button key={playlist.id} onClick={() => addTrackMutation.mutate({ playlistId: playlist.id, track: trackToAdd })}><MusicArtwork tone={playlist.coverTone} accent={playlist.coverAccent} label={playlist.title} size="xs" /><span><strong>{playlist.title}</strong><small>{playlist.tracks.length} tracks</small></span><Plus size={18} /></button>)}</div><button className="secondary-button modal-create" onClick={() => { setTrackToAdd(null); setPlaylistDialog(true); }}><Plus size={17} />Create new playlist</button></> : <form onSubmit={createPlaylist}><p className="eyebrow">Your library</p><h2 id="playlist-modal-title">Create a playlist</h2><label className="form-label">Name<input value={playlistTitle} maxLength={140} autoFocus onChange={event => setPlaylistTitle(event.target.value)} placeholder="e.g. Sunday sunrise" /></label><label className="form-label">Description <small>optional</small><textarea value={playlistDescription} maxLength={320} onChange={event => setPlaylistDescription(event.target.value)} placeholder="Give it a little context" /></label><button className="primary-button" disabled={!playlistTitle.trim() || createPlaylistMutation.isPending}>{createPlaylistMutation.isPending ? "Creating…" : "Create playlist"}</button></form>}
      </div></div>}
    </div>
  );
}

export function SearchSuggestions({ suggestions, onSelect, onClearRecent }: { suggestions: SearchSuggestion[]; onSelect: (suggestion: SearchSuggestion) => void; onClearRecent?: () => void }) {
  if (!suggestions.length) return null;
  const showingRecent = suggestions.every(suggestion => suggestion.type === "recent");
  return <div className="search-suggestions" role="listbox" aria-label={showingRecent ? "Recent searches" : "Related search suggestions"}>{showingRecent && <div className="search-suggestions__header"><span>Recent searches</span>{onClearRecent && <button type="button" aria-label="Clear recent searches" onMouseDown={event => event.preventDefault()} onClick={onClearRecent}>Clear</button>}</div>}{suggestions.map(suggestion => <button key={suggestion.id} role="option" aria-label={`${suggestion.label}, ${suggestion.detail}`} onMouseDown={event => event.preventDefault()} onClick={() => onSelect(suggestion)}><span className="search-suggestions__type">{suggestion.type === "related" ? "Related" : suggestion.type}</span><span><strong>{suggestion.label}</strong><small>{suggestion.detail}</small></span><ChevronRight size={16} /></button>)}</div>;
}

function HomeView({ tracks, playlists, likedIds, onPlay, onOpenPlaylist, onLike, onAdd, onShowAll, liveCatalog }: { tracks: MusicTrack[]; playlists: MusicPlaylist[]; likedIds: Set<string>; onPlay: (track: MusicTrack, tracks?: MusicTrack[]) => void; onOpenPlaylist: (id: number) => void; onLike: (track: MusicTrack) => void; onAdd: (track: MusicTrack) => void; onShowAll: () => void; liveCatalog: boolean }) {
  const featured = playlists[0];
  return <div className="page page--home">
    {featured && <section className="hero-card" style={{ "--hero-tone": featured.coverTone, "--hero-accent": featured.coverAccent } as React.CSSProperties}><div className="hero-card__wash" /><div className="hero-card__copy"><p className="eyebrow">Curated for right now</p><h1>Find your <em>afterglow.</em></h1><p>Small hours, soft focus, and songs with somewhere to take you.</p><div className="hero-card__buttons"><button className="primary-button" onClick={() => onPlay(featured.tracks[0], featured.tracks)}><Play size={16} fill="currentColor" />Play mix</button><button className="ghost-button" onClick={() => onOpenPlaylist(featured.id)}>View playlist</button></div></div><div className="hero-card__art"><MusicArtwork tone={featured.coverTone} accent={featured.coverAccent} label={featured.title} size="hero" /></div></section>}
    <SectionTitle eyebrow="Start here" title="Made for your moment" />
    <div className="playlist-grid">{playlists.map((playlist, index) => <button key={playlist.id} className="playlist-card" onClick={() => onOpenPlaylist(playlist.id)}><MusicArtwork tone={playlist.coverTone} accent={playlist.coverAccent} label={playlist.title} size="lg" /><span className="playlist-card__index">0{index + 1}</span><strong>{playlist.title}</strong><p>{playlist.description}</p><span className="playlist-card__play"><Play size={15} fill="currentColor" /></span></button>)}</div>
    <SectionTitle eyebrow={liveCatalog ? "Live from Audius" : "Fresh in the catalog"} title={liveCatalog ? "Open sounds, right now" : "New arrivals"} action="Browse catalog" onAction={onShowAll} />
    <div className="track-list">{tracks.slice(0, 6).map((track, index) => <TrackRow key={track.id} track={track} index={index} liked={likedIds.has(track.id)} onPlay={() => onPlay(track, tracks)} onLike={() => onLike(track)} onAdd={() => onAdd(track)} onMore={() => toast.message(`${track.artist} · ${track.genre}`)} />)}</div>
  </div>;
}

export function SearchView({ query, tracks, playlists, commercialVideos, commercialAvailability = "available", likedIds, onPlay, onOpenPlaylist, onLike, onAdd, onFilterGenre, onPlayCommercial }: { query: string; tracks: MusicTrack[]; playlists: MusicPlaylist[]; commercialVideos: CommercialVideo[]; commercialAvailability?: "available" | "rate_limited" | "unavailable"; likedIds: Set<string>; onPlay: (track: MusicTrack, tracks?: MusicTrack[]) => void; onOpenPlaylist: (id: number) => void; onLike: (track: MusicTrack) => void; onAdd: (track: MusicTrack) => void; onFilterGenre: (genre: string) => void; onPlayCommercial: (video: CommercialVideo) => void }) {
  if (!query.trim()) return <div className="page"><SectionTitle eyebrow="Browse all" title="Find your next sound" /><p className="hybrid-intro">Search open tracks from Audius or official commercial releases through the visible YouTube player.</p><div className="genre-grid">{["Bollywood", "Bhojpuri", "Punjabi", "Tamil", "Ambient", "Electronic", "Indie", "Lo-fi"].map((genre, index) => <button key={genre} className={`genre-tile genre-tile--${index % 4}`} onClick={() => onFilterGenre(genre)}>{genre}{index < 4 && <em>Official video</em>}<span>{String(index + 1).padStart(2, "0")}</span></button>)}</div></div>;
  return <div className="page"><SectionTitle eyebrow="Search results" title={`Results for “${query}”`} />{tracks.length === 0 && playlists.length === 0 && commercialVideos.length === 0 && commercialAvailability === "available" ? <EmptyState title="No close matches" description="Try a track name, artist, album, playlist, or regional genre." /> : <><div className="search-summary"><span>{tracks.length} open tracks</span><span>{commercialVideos.length} official videos</span><span>{playlists.length} playlists</span></div>{commercialAvailability !== "available" && <div className="commercial-status" role="status"><strong>{commercialAvailability === "rate_limited" ? "Official YouTube results are temporarily paused" : "Official YouTube results are temporarily unavailable"}</strong><p>Open-catalog music and local results are still available. Please try commercial releases again shortly.</p></div>}{commercialVideos.length > 0 && <><SectionTitle eyebrow="Official commercial releases" title="Play in Soundwave" /><div className="commercial-grid">{commercialVideos.map(video => <button key={video.id} className="commercial-card" onClick={() => onPlayCommercial(video)}>{video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : <div className="commercial-card__fallback" />}<span className="commercial-card__play"><Play size={15} fill="currentColor" /></span><strong>{video.title}</strong><p>{video.channelTitle}</p><small>Official YouTube playback</small></button>)}</div></>}{tracks.length > 0 && <><SectionTitle eyebrow="Soundwave results" title="Songs for your search" /><div className="search-track-grid">{tracks.map(track => <button key={track.id} className="search-track-card" aria-label={`Play ${track.title}`} onClick={() => onPlay(track, tracks)}><MusicArtwork tone={track.coverTone} accent={track.coverAccent} label={track.title} size="lg" /><span className="search-track-card__play"><Play size={15} fill="currentColor" /></span><strong>{track.title}</strong><p>{track.artist} · {track.album}</p><small><span>{track.genre}</span><span>{formatTime(track.durationSeconds)}</span></small></button>)}</div></>}{playlists.length > 0 && <><SectionTitle eyebrow="Collections" title="Matching playlists" /><div className="playlist-grid playlist-grid--compact">{playlists.map(playlist => <button key={playlist.id} className="playlist-card" onClick={() => onOpenPlaylist(playlist.id)}><MusicArtwork tone={playlist.coverTone} accent={playlist.coverAccent} label={playlist.title} size="lg" /><strong>{playlist.title}</strong><p>{playlist.description}</p></button>)}</div></>}</>}</div>;
}

function LibraryView({ authenticated, playlists, likedCount, onLogin, onOpenLiked, onOpenPlaylist, onCreate }: { authenticated: boolean; playlists: MusicPlaylist[]; likedCount: number; onLogin: () => void; onOpenLiked: () => void; onOpenPlaylist: (id: number) => void; onCreate: () => void }) {
  if (!authenticated) return <div className="page"><EmptyState title="Your music, in one place" description="Sign in to save loved tracks and build playlists that travel with you." action={<button className="primary-button" onClick={onLogin}>Sign in to your library</button>} /></div>;
  return <div className="page"><div className="library-heading"><div><p className="eyebrow">Your space</p><h1>Your library</h1></div><button className="secondary-button" onClick={onCreate}><Plus size={17} />New playlist</button></div><div className="library-feature-grid"><button className="liked-feature" onClick={onOpenLiked}><span><Heart size={27} fill="currentColor" /></span><div><p>Liked songs</p><strong>{likedCount} saved {likedCount === 1 ? "track" : "tracks"}</strong></div><ChevronRight size={19} /></button></div><SectionTitle eyebrow="Created by you" title="Your playlists" />{playlists.length ? <div className="playlist-grid">{playlists.map(playlist => <button key={playlist.id} className="playlist-card" onClick={() => onOpenPlaylist(playlist.id)}><MusicArtwork tone={playlist.coverTone} accent={playlist.coverAccent} label={playlist.title} size="lg" /><strong>{playlist.title}</strong><p>{playlist.tracks.length} tracks · {playlist.description || "Your Soundwave playlist"}</p></button>)}</div> : <EmptyState title="Make your first mixtape" description="Build a collection for any feeling, place, or passing obsession." action={<button className="secondary-button" onClick={onCreate}><Plus size={17} />Create playlist</button>} />}</div>;
}

function LikedView({ authenticated, tracks, likedIds, onLogin, onPlay, onLike, onAdd }: { authenticated: boolean; tracks: MusicTrack[]; likedIds: Set<string>; onLogin: () => void; onPlay: (track: MusicTrack, tracks?: MusicTrack[]) => void; onLike: (track: MusicTrack) => void; onAdd: (track: MusicTrack) => void }) {
  if (!authenticated) return <div className="page"><EmptyState title="Keep the songs you love close" description="Sign in to keep your likes in sync with your library." action={<button className="primary-button" onClick={onLogin}>Sign in</button>} /></div>;
  return <div className="page"><section className="collection-header"><div className="collection-header__heart"><Heart fill="currentColor" size={54} /></div><div><p className="eyebrow">Playlist</p><h1>Liked Songs</h1><p>{tracks.length} {tracks.length === 1 ? "song" : "songs"} saved to your library</p></div></section>{tracks.length ? <><button className="big-play" onClick={() => onPlay(tracks[0], tracks)}><Play size={19} fill="currentColor" /></button><div className="track-list">{tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} liked={likedIds.has(track.id)} onPlay={() => onPlay(track, tracks)} onLike={() => onLike(track)} onAdd={() => onAdd(track)} />)}</div></> : <EmptyState title="Nothing saved just yet" description="Tap the heart on any song to keep it here." />}</div>;
}

function PlaylistView({ playlist, likedIds, currentTrackId, isPlaying, onBack, onPlay, onLike, onAdd, onRemove }: { playlist?: MusicPlaylist; likedIds: Set<string>; currentTrackId?: string; isPlaying: boolean; onBack: () => void; onPlay: (track: MusicTrack, tracks?: MusicTrack[]) => void; onLike: (track: MusicTrack) => void; onAdd: (track: MusicTrack) => void; onRemove: (track: MusicTrack) => void | false }) {
  if (!playlist) return <div className="page"><EmptyState title="Playlist unavailable" description="This collection may have been moved or removed." action={<button className="secondary-button" onClick={onBack}>Back to home</button>} /></div>;
  return <div className="page"><button className="back-link" onClick={onBack}><ChevronLeft size={16} />Back</button><section className="playlist-header"><MusicArtwork tone={playlist.coverTone} accent={playlist.coverAccent} label={playlist.title} size="hero" /><div><p className="eyebrow">{playlist.kind === "user" ? "Your playlist" : "Curated playlist"}</p><h1>{playlist.title}</h1><p>{playlist.description || "A hand-picked Soundwave collection."}</p><small>{playlist.tracks.length} tracks</small></div></section>{playlist.tracks.length ? <><div className="playlist-header__controls"><button className="big-play" onClick={() => onPlay(playlist.tracks[0], playlist.tracks)}><Play size={19} fill="currentColor" /></button></div><div className="track-list">{playlist.tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} playing={isPlaying && currentTrackId === track.id} liked={likedIds.has(track.id)} onPlay={() => onPlay(track, playlist.tracks)} onLike={() => onLike(track)} onAdd={() => onAdd(track)} onMore={playlist.kind === "user" ? () => onRemove(track) : undefined} />)}</div></> : <EmptyState title="A clean slate" description="Add tracks from anywhere in Soundwave to make this playlist yours." />}</div>;
}

function SectionTitle({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) { return <div className="section-title">{<div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>}{action && <button onClick={onAction}>{action}<ChevronRight size={15} /></button>}</div>; }

function QueuePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { queue, queueIndex, currentTrack, isPlaying, jumpToQueueIndex, removeFromQueue } = usePlayer();
  return <aside className={open ? "queue-panel queue-panel--open" : "queue-panel"} aria-label="Playback queue"><div className="queue-panel__header"><div><p className="eyebrow">Up next</p><h2>Queue</h2></div><button aria-label="Close queue" className="icon-button" onClick={onClose}><X size={19} /></button></div>{currentTrack && <div className="queue-now"><p>Now playing</p><div><MusicArtwork tone={currentTrack.coverTone} accent={currentTrack.coverAccent} label={currentTrack.title} size="sm" /><span><strong>{currentTrack.title}</strong><small>{currentTrack.artist}</small></span>{isPlaying && <span className="queue-pulse" />}</div></div>}<div className="queue-list">{queue.length === 0 ? <EmptyState title="Your queue is open" description="Play a track and it will land here." /> : queue.map((track, index) => <div className={index === queueIndex ? "queue-item queue-item--active" : "queue-item"} key={`${track.id}-${index}`}><button onClick={() => jumpToQueueIndex(index)}><span>{index + 1}</span><MusicArtwork tone={track.coverTone} accent={track.coverAccent} label={track.title} size="xs" /><span><strong>{track.title}</strong><small>{track.artist}</small></span></button>{index !== queueIndex && <button aria-label={`Remove ${track.title} from queue`} className="icon-button" onClick={() => removeFromQueue(track.id)}><X size={16} /></button>}</div>)}</div></aside>;
}

function PlayerBar({ onQueue }: { onQueue: () => void }) {
  const { currentTrack, isPlaying, elapsed, volume, queue, shuffle, repeat, togglePlay, playPrevious, playNext, seek, setVolume, toggleShuffle, toggleRepeat } = usePlayer();
  const duration = currentTrack?.durationSeconds ?? 0;
  const progress = duration ? Math.min(100, elapsed / duration * 100) : 0;
  return <footer className="player-bar"><div className="now-playing">{currentTrack ? <><MusicArtwork tone={currentTrack.coverTone} accent={currentTrack.coverAccent} label={currentTrack.title} size="sm" /><div><strong>{currentTrack.title}</strong><span>{currentTrack.artist}</span></div></> : <><div className="now-playing__blank"><Music2Icon /></div><span>Choose something to play</span></>}</div><div className="player-controls"><div className="player-controls__buttons"><button className={shuffle ? "control-button control-button--selected" : "control-button"} aria-label="Shuffle" onClick={toggleShuffle}><Shuffle size={16} /></button><button className="control-button" aria-label="Previous track" onClick={playPrevious}><SkipBack size={19} fill="currentColor" /></button><button className="play-button" aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlay} disabled={!currentTrack && queue.length === 0}>{isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button className="control-button" aria-label="Next track" onClick={playNext}><SkipForward size={19} fill="currentColor" /></button><button className={repeat !== "off" ? "control-button control-button--selected" : "control-button"} aria-label={`Repeat ${repeat}`} onClick={toggleRepeat}><Repeat2 size={16} />{repeat === "one" && <small>1</small>}</button></div><div className="progress-row"><span>{formatTime(elapsed)}</span><input aria-label="Track progress" type="range" min="0" max={duration || 1} value={Math.min(elapsed, duration || 1)} style={{ "--range-progress": `${progress}%` } as React.CSSProperties} onChange={event => seek(Number(event.target.value))} /><span>{formatTime(duration)}</span></div></div><div className="player-options"><button aria-label="Open queue" className="control-button" onClick={onQueue}><ListMusic size={17} /></button><VolumeButton volume={volume} onChange={setVolume} /></div></footer>;
}

function Music2Icon() { return <ListMusic size={19} />; }

export function VolumeButton({ volume, onChange }: { volume: number; onChange: (volume: number) => void }) { return <div className="volume-control"><button className="control-button" aria-label={volume ? "Mute" : "Unmute"} onClick={() => onChange(nextPreviewVolume(volume))}>{volume ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={event => onChange(Number(event.target.value))} /></div>; }

export function MobileNav({ current, onChange }: { current: View; onChange: (view: View) => void }) { return <nav className="mobile-nav" aria-label="Mobile navigation"><button className={current === "home" ? "mobile-nav__active" : ""} onClick={() => onChange("home")}><HomeIcon size={19} />Home</button><button className={current === "search" ? "mobile-nav__active" : ""} onClick={() => onChange("search")}><Search size={19} />Search</button><button className={current === "library" ? "mobile-nav__active" : ""} onClick={() => onChange("library")}><Library size={19} />Library</button></nav>; }
