import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileNav, SearchSuggestions, SearchView, VolumeButton } from "./Home";

describe("rendered Soundwave interactions", () => {
  it("changes navigation when a rendered mobile destination is clicked", () => {
    const onChange = vi.fn();
    render(<MobileNav current="home" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onChange).toHaveBeenCalledWith("search");
  });

  it("passes a clicked genre tile into the search flow", () => {
    const onFilterGenre = vi.fn();
    render(<SearchView query="" tracks={[]} playlists={[]} commercialVideos={[]} likedIds={new Set()} onPlay={vi.fn()} onOpenPlaylist={vi.fn()} onLike={vi.fn()} onAdd={vi.fn()} onFilterGenre={onFilterGenre} onPlayCommercial={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /electronic/i }));

    expect(onFilterGenre).toHaveBeenCalledWith("Electronic");
  });

  it("mutes and restores maximum volume through the rendered volume control", () => {
    const onChange = vi.fn();
    const { rerender } = render(<VolumeButton volume={1} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(onChange).toHaveBeenCalledWith(0);

    rerender(<VolumeButton volume={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Unmute" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("allows a related search suggestion to be selected", () => {
    const onSelect = vi.fn();
    render(<SearchSuggestions suggestions={[{ id: "related:bhojpuri", label: "Bhojpuri", detail: "Related search", query: "Bhojpuri", type: "related" }]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("option", { name: "Bhojpuri, Related search" }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ query: "Bhojpuri" }));
  });

  it("renders searched native tracks as clickable discovery cards", () => {
    const track = { id: "search-card", title: "Signal Bloom", artist: "Soundwave Archive", album: "Night Index", durationSeconds: 218, genre: "Ambient", coverTone: "#1b365d", coverAccent: "#79c8ff", audioUrl: null };
    const onPlay = vi.fn();
    const { container } = render(<SearchView query="signal" tracks={[track]} playlists={[]} commercialVideos={[]} likedIds={new Set()} onPlay={onPlay} onOpenPlaylist={vi.fn()} onLike={vi.fn()} onAdd={vi.fn()} onFilterGenre={vi.fn()} onPlayCommercial={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Songs for your search" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Play Signal Bloom" }));
    expect(onPlay).toHaveBeenCalledWith(track, [track]);
    expect(container.querySelector(".search-track-grid")).toBeTruthy();
  });
});
