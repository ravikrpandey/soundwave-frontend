import { describe, expect, it } from "vitest";
import { buildSearchSuggestions } from "./musicInteractions";

const tracks = [{ id: "track-1", title: "Bollywood Afterglow", artist: "Ravi Rao", album: "Night Drive", durationSeconds: 181, genre: "Bollywood", coverTone: "#000", coverAccent: "#fff", audioUrl: null }];
const playlists = [{ id: 1, title: "Bollywood Nights", description: "Official favourites", coverTone: "#000", coverAccent: "#fff", kind: "curated" as const, tracks }];

describe("buildSearchSuggestions", () => {
  it("returns local, Audius, official-video, playlist, and related query suggestions without waiting for providers", () => {
    const audiusTracks = [{ ...tracks[0], id: "audius:one", title: "Bollywood Live Signal", artist: "Audius Artist" }];
    const officialVideos = [{ id: "official-one", title: "Bollywood Official Release", channelTitle: "Official Label", thumbnailUrl: "", provider: "youtube" as const }];
    const suggestions = buildSearchSuggestions("bolly", tracks, playlists, audiusTracks, officialVideos);

    expect(suggestions.map(suggestion => suggestion.label)).toContain("Bollywood Afterglow");
    expect(suggestions.map(suggestion => suggestion.label)).toContain("Bollywood Nights");
    expect(suggestions.map(suggestion => suggestion.label)).toContain("Bollywood");
    expect(suggestions).toContainEqual(expect.objectContaining({ label: "Bollywood Live Signal", type: "audius" }));
    expect(suggestions).toContainEqual(expect.objectContaining({ label: "Bollywood Official Release", type: "official" }));
  });
});
