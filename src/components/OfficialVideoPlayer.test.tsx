import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OfficialVideoPlayer from "./OfficialVideoPlayer";

afterEach(cleanup);

describe("OfficialVideoPlayer", () => {
  it("renders a visible official YouTube embed rather than a hidden audio source", () => {
    const video = { id: "official-video", title: "Official Bollywood Release", channelTitle: "Official Label", thumbnailUrl: "", provider: "youtube" as const };
    render(<OfficialVideoPlayer video={video} videos={[video]} onSelect={() => undefined} onClose={() => undefined} />);

    expect(screen.getByTestId("official-video-player")).toBeTruthy();
    expect(screen.getByTitle("Official YouTube video player").getAttribute("src")).toContain("youtube.com/embed/official-video");
    expect(screen.getByText("Highest available quality requested")).toBeTruthy();
  });

  it("moves through the visible commercial search order with next and previous controls", () => {
    const first = { id: "official-one", title: "Official Release One", channelTitle: "Official Label", thumbnailUrl: "", provider: "youtube" as const };
    const second = { id: "official-two", title: "Official Release Two", channelTitle: "Official Label", thumbnailUrl: "", provider: "youtube" as const };
    const onSelect = vi.fn();
    render(<OfficialVideoPlayer video={first} videos={[first, second]} onSelect={onSelect} onClose={() => undefined} />);

    expect((screen.getByRole("button", { name: "Previous official release" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next official release" }));
    expect(onSelect).toHaveBeenCalledWith(second);
  });
});
