import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastMock = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { PlayerProvider, usePlayer } from "./PlayerContext";

const liveTrack = {
  id: "audius:3oqjbGv",
  title: "Peak",
  artist: "@iLLPeTiLL",
  album: "Empowering",
  durationSeconds: 356,
  genre: "House",
  coverTone: "#5b4b2a",
  coverAccent: "#f7df74",
  audioUrl: "https://api.audius.co/v1/tracks/3oqjbGv/stream",
};
const secondLiveTrack = { ...liveTrack, id: "audius:second", title: "Second Peak", audioUrl: "https://api.audius.co/v1/tracks/second/stream" };

let audioInstances: FakeAudio[] = [];
let nextPlayResult: Promise<void> = Promise.resolve();

class FakeAudio {
  private listeners = new Map<string, EventListener>();
  readonly dataset = {} as DOMStringMap;
  preload = "";
  volume = 1;
  currentTime = 0;
  duration = 356;
  play = vi.fn(() => nextPlayResult);
  pause = vi.fn();
  addEventListener = vi.fn((name: string, listener: EventListener) => this.listeners.set(name, listener));
  removeEventListener = vi.fn((name: string) => this.listeners.delete(name));

  emit(name: string) {
    this.listeners.get(name)?.(new Event(name));
  }

  constructor(public src: string) {
    audioInstances.push(this);
  }
}

function PlayerProbe() {
  const player = usePlayer();
  return <><button onClick={() => player.playTrack(liveTrack, [liveTrack])}>Play live track</button><output>{player.isPlaying ? "playing" : "paused"}</output></>;
}

function TransportProbe() {
  const player = usePlayer();
  return <><button onClick={() => player.playTrack(liveTrack, [liveTrack, secondLiveTrack])}>Start queue</button><button onClick={player.playPrevious}>Previous queued track</button><button onClick={player.playNext}>Next queued track</button><output>{player.currentTrack?.id ?? "none"}:{player.isPlaying ? "playing" : "paused"}</output></>;
}

beforeEach(() => {
  audioInstances = [];
  nextPlayResult = Promise.resolve();
  toastMock.error.mockReset();
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Audius stream playback", () => {
  it("starts a live stream directly from the user click before player effects run", async () => {
    render(<PlayerProvider><PlayerProbe /></PlayerProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Play live track" }));

    await waitFor(() => expect(audioInstances).toHaveLength(1));
    expect(audioInstances[0]?.src).toBe(liveTrack.audioUrl);
    expect(audioInstances[0]?.play).toHaveBeenCalled();
    expect(screen.getByText("playing")).toBeTruthy();
  });

  it("returns the player to paused state when a live stream is rejected", async () => {
    nextPlayResult = Promise.reject(new Error("stream unavailable"));
    render(<PlayerProvider><PlayerProbe /></PlayerProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Play live track" }));

    await waitFor(() => expect(screen.getByText("paused")).toBeTruthy());
    expect(toastMock.error).toHaveBeenCalledWith("This live stream could not start. Please try another track.");
  });

  it("stops playback and reports a user-facing message when the browser emits a media error", async () => {
    render(<PlayerProvider><PlayerProbe /></PlayerProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Play live track" }));

    await waitFor(() => expect(audioInstances[0]?.addEventListener).toHaveBeenCalledWith("error", expect.any(Function)));
    audioInstances[0]?.emit("error");

    await waitFor(() => expect(screen.getByText("paused")).toBeTruthy());
    expect(toastMock.error).toHaveBeenCalledWith("This live stream could not be played. Please try another track.");
  });

  it("starts the selected live stream directly from previous and next transport clicks", async () => {
    render(<PlayerProvider><TransportProbe /></PlayerProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Start queue" }));
    await waitFor(() => expect(audioInstances[0]?.play).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Next queued track" }));
    await waitFor(() => expect(audioInstances).toHaveLength(2));
    expect(audioInstances[1]?.src).toBe(secondLiveTrack.audioUrl);
    expect(audioInstances[1]?.play).toHaveBeenCalled();
    expect(screen.getByText(`${secondLiveTrack.id}:playing`)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Previous queued track" }));
    await waitFor(() => expect(audioInstances).toHaveLength(3));
    expect(audioInstances[2]?.src).toBe(liveTrack.audioUrl);
    expect(audioInstances[2]?.play).toHaveBeenCalled();
    expect(screen.getByText(`${liveTrack.id}:playing`)).toBeTruthy();
  });
});
