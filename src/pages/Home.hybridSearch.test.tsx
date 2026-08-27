import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchView } from "./Home";

const openTrack = {
  id: "audius:open-track", title: "Open Catalog Track", artist: "Open Artist", album: "Open Album", durationSeconds: 180,
  genre: "Electronic", coverTone: "#235b6a", coverAccent: "#a7e3d4", audioUrl: "https://api.audius.co/v1/tracks/open-track/stream", source: "audius" as const,
};
const commercialVideo = { id: "official-video", title: "Official Bhojpuri Release", channelTitle: "Official Label", thumbnailUrl: "", provider: "youtube" as const };

describe("hybrid commercial and open-catalog discovery", () => {
  it("visibly separates official YouTube videos from native Audius streams", () => {
    const onPlayCommercial = vi.fn();
    render(<SearchView query="Bhojpuri" tracks={[openTrack]} playlists={[]} commercialVideos={[commercialVideo]} likedIds={new Set()} onPlay={vi.fn()} onOpenPlaylist={vi.fn()} onLike={vi.fn()} onAdd={vi.fn()} onFilterGenre={vi.fn()} onPlayCommercial={onPlayCommercial} />);

    expect(screen.getByText("Official commercial releases")).toBeTruthy();
    expect(screen.getByText("Official YouTube playback")).toBeTruthy();
    expect(screen.getByText("Soundwave results")).toBeTruthy();
    expect(screen.getByText("Songs for your search")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play Open Catalog Track" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /official bhojpuri release/i }));
    expect(onPlayCommercial).toHaveBeenCalledWith(commercialVideo);
  });
});
