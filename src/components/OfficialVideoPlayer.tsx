import React, { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles, X } from "lucide-react";
import type { CommercialVideo } from "@/types/music";

export default function OfficialVideoPlayer({ video, videos, onSelect, onClose }: { video: CommercialVideo; videos: CommercialVideo[]; onSelect: (video: CommercialVideo) => void; onClose: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const source = `https://www.youtube.com/embed/${encodeURIComponent(video.id)}?autoplay=1&playsinline=1&enablejsapi=1&rel=0`;
  const activeIndex = Math.max(0, videos.findIndex(candidate => candidate.id === video.id));
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < videos.length - 1;
  const requestHighestAvailableQuality = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["highres"] }), "https://www.youtube.com");
  }, []);

  return <section className="official-player" data-testid="official-video-player" aria-label="Official YouTube playback">
    <div className="official-player__heading"><div><p className="eyebrow">Commercial release</p><h2>{video.title}</h2><p>{video.channelTitle} · Official YouTube playback</p></div><button className="icon-button" aria-label="Close official video player" onClick={onClose}><X size={19} /></button></div>
    <div className="official-player__navigation" aria-label="Official release navigation"><button aria-label="Previous official release" className="control-button" disabled={!canGoPrevious} onClick={() => canGoPrevious && onSelect(videos[activeIndex - 1])}><ChevronLeft size={18} /></button><span>{activeIndex + 1} of {videos.length}</span><button aria-label="Next official release" className="control-button" disabled={!canGoNext} onClick={() => canGoNext && onSelect(videos[activeIndex + 1])}><ChevronRight size={18} /></button></div>
    <div className="official-player__frame-wrap"><iframe key={video.id} ref={frameRef} title="Official YouTube video player" src={source} onLoad={requestHighestAvailableQuality} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /><div className="official-player__quality"><Sparkles size={14} />Highest available quality requested <span>· adaptive to the release and connection</span></div></div>
    <a className="official-player__link" href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`} target="_blank" rel="noreferrer">Open on YouTube <ExternalLink size={14} /></a>
  </section>;
}
