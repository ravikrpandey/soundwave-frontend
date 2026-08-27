import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMock = vi.hoisted(() => ({
  catalog: {
    home: { useQuery: vi.fn() },
    audiusTrending: { useQuery: vi.fn() },
    search: { useQuery: vi.fn() },
    audiusSearch: { useQuery: vi.fn() },
    youtubeSearch: { useQuery: vi.fn() },
  },
  library: {
    get: { useQuery: vi.fn() },
    toggleLike: { useMutation: vi.fn() },
    createPlaylist: { useMutation: vi.fn() },
    addTrack: { useMutation: vi.fn() },
    removeTrack: { useMutation: vi.fn() },
  },
}));

vi.mock("@/lib/trpc", () => ({ trpc: trpcMock }));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false, error: null, isAuthenticated: false, logout: vi.fn() }),
}));
vi.mock("@/contexts/PlayerContext", () => ({
  usePlayer: () => ({
    queue: [], queueIndex: -1, currentTrack: null, isPlaying: false, elapsed: 0, volume: 1, shuffle: false, repeat: "off",
    playTrack: vi.fn(), togglePlay: vi.fn(), playPrevious: vi.fn(), playNext: vi.fn(), seek: vi.fn(), setVolume: vi.fn(),
    toggleShuffle: vi.fn(), toggleRepeat: vi.fn(), jumpToQueueIndex: vi.fn(), removeFromQueue: vi.fn(),
  }),
}));

import Home from "./Home";

const fallbackTrack = {
  id: "archive-fallback", title: "Fallback Signal", artist: "Soundwave Archive", album: "Offline Set",
  durationSeconds: 180, genre: "Ambient", coverTone: "#1b365d", coverAccent: "#79c8ff", audioUrl: null,
};
const querySuccess = (data: unknown) => ({ data, isLoading: false, isError: false });
const emptyLibrary = { likedTracks: [], playlists: [] };
const noopMutation = { mutate: vi.fn(), isPending: false };

function configureFallback({ providerError = false, commercialAvailability = "available" }: { providerError?: boolean; commercialAvailability?: "available" | "rate_limited" | "unavailable" } = {}) {
  trpcMock.catalog.home.useQuery.mockReturnValue(querySuccess({ tracks: [fallbackTrack], playlists: [] }));
  trpcMock.catalog.audiusTrending.useQuery.mockReturnValue({ data: undefined, isLoading: false, isError: providerError });
  trpcMock.catalog.search.useQuery.mockReturnValue(querySuccess({ tracks: [fallbackTrack], playlists: [] }));
  trpcMock.catalog.audiusSearch.useQuery.mockReturnValue({ data: [], isLoading: false, isError: providerError });
  trpcMock.catalog.youtubeSearch.useQuery.mockReturnValue({ data: { videos: [], availability: commercialAvailability }, isLoading: false, isError: providerError });
  trpcMock.library.get.useQuery.mockReturnValue(querySuccess(emptyLibrary));
  trpcMock.library.toggleLike.useMutation.mockReturnValue(noopMutation);
  trpcMock.library.createPlaylist.useMutation.mockReturnValue(noopMutation);
  trpcMock.library.addTrack.useMutation.mockReturnValue(noopMutation);
  trpcMock.library.removeTrack.useMutation.mockReturnValue(noopMutation);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  configureFallback();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Soundwave provider fallback", () => {
  it("renders the seeded home catalog when Audius is unavailable", () => {
    configureFallback({ providerError: true });
    const view = render(<Home />);
    const scoped = within(view.container);

    expect(scoped.getByText("Fallback Signal")).toBeTruthy();
    expect(scoped.queryByText("Open sounds, right now")).toBeNull();
  });

  it("uses local search matches when Audius returns an empty search response", async () => {
    vi.useFakeTimers();
    const view = render(<Home />);
    const scoped = within(view.container);
    fireEvent.click(within(scoped.getByRole("navigation", { name: "Primary navigation" })).getByRole("button", { name: "Search" }));
    fireEvent.change(scoped.getByRole("textbox", { name: "Search tracks, artists, or playlists" }), { target: { value: "fallback" } });
    await act(async () => { vi.advanceTimersByTime(140); });

    expect(scoped.getByRole("heading", { name: "Results for “fallback”" })).toBeTruthy();
    expect(scoped.getAllByText("Fallback Signal").length).toBeGreaterThanOrEqual(1);
  });

  it("keeps local search results available and explains a temporary YouTube quota limit", async () => {
    configureFallback({ commercialAvailability: "rate_limited" });
    vi.useFakeTimers();
    const view = render(<Home />);
    const scoped = within(view.container);
    fireEvent.click(within(scoped.getByRole("navigation", { name: "Primary navigation" })).getByRole("button", { name: "Search" }));
    fireEvent.change(scoped.getByRole("textbox", { name: "Search tracks, artists, or playlists" }), { target: { value: "fallback" } });
    await act(async () => { vi.advanceTimersByTime(140); });

    expect(scoped.getByText("Official YouTube results are temporarily paused")).toBeTruthy();
    expect(scoped.getAllByText("Fallback Signal").length).toBeGreaterThanOrEqual(1);
  });

  it("dismisses related search suggestions after selection and outside pointer interaction", async () => {
    vi.useFakeTimers();
    const view = render(<Home />);
    const scoped = within(view.container);
    fireEvent.click(within(scoped.getByRole("navigation", { name: "Primary navigation" })).getByRole("button", { name: "Search" }));
    const input = scoped.getByRole("textbox", { name: "Search tracks, artists, or playlists" });
    fireEvent.change(input, { target: { value: "fallback" } });
    await act(async () => { vi.advanceTimersByTime(140); });

    expect(scoped.getByRole("listbox", { name: "Related search suggestions" })).toBeTruthy();
    fireEvent.click(scoped.getByRole("option", { name: /fallback signal/i }));
    expect(scoped.queryByRole("listbox", { name: "Related search suggestions" })).toBeNull();

    fireEvent.focus(input);
    expect(scoped.getByRole("listbox", { name: "Related search suggestions" })).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(scoped.queryByRole("listbox", { name: "Related search suggestions" })).toBeNull();
  });

  it("shows selectable recent searches in an empty focused search box and allows them to be cleared", () => {
    window.localStorage.setItem("soundwave-recent-searches-v1", JSON.stringify(["Bhojpuri", "Late night lo-fi"]));
    const view = render(<Home />);
    const scoped = within(view.container);
    fireEvent.click(within(scoped.getByRole("navigation", { name: "Primary navigation" })).getByRole("button", { name: "Search" }));
    const input = scoped.getByRole("textbox", { name: "Search tracks, artists, or playlists" });
    fireEvent.focus(input);

    expect(scoped.getByRole("listbox", { name: "Recent searches" })).toBeTruthy();
    fireEvent.click(scoped.getByRole("option", { name: "Bhojpuri, Search again" }));
    expect((input as HTMLInputElement).value).toBe("Bhojpuri");
    expect(scoped.queryByRole("listbox", { name: "Recent searches" })).toBeNull();

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.focus(input);
    fireEvent.click(scoped.getByRole("button", { name: "Clear recent searches" }));
    expect(window.localStorage.getItem("soundwave-recent-searches-v1")).toBeNull();
  });
});
