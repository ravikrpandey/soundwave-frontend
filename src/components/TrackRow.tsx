import React from "react";
import { Heart, MoreHorizontal, Play, Plus } from "lucide-react";
import MusicArtwork from "@/components/MusicArtwork";
import { MusicTrack } from "@/types/music";

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

type TrackRowProps = {
  track: MusicTrack;
  index?: number;
  playing?: boolean;
  liked?: boolean;
  onPlay: () => void;
  onLike?: () => void;
  onAdd?: () => void;
  onMore?: () => void;
  dense?: boolean;
};

export default function TrackRow({ track, index, playing, liked, onPlay, onLike, onAdd, onMore, dense }: TrackRowProps) {
  return (
    <div className={`track-row ${playing ? "track-row--playing" : ""} ${dense ? "track-row--dense" : ""}`}>
      {index !== undefined && <span className="track-row__index">{playing ? <span className="equalizer"><i /><i /><i /></span> : index + 1}</span>}
      <button className="track-row__main" onClick={onPlay} type="button">
        <MusicArtwork tone={track.coverTone} accent={track.coverAccent} label={track.title} size="sm" />
        <span className="track-row__copy">
          <strong>{track.title}</strong>
          <span>{track.artist}</span>
        </span>
        <span className="track-row__album">{track.album}</span>
      </button>
      <div className="track-row__actions">
        {onLike && <button aria-label={`Like ${track.title}`} className={liked ? "icon-button icon-button--liked" : "icon-button"} onClick={onLike} type="button"><Heart size={17} fill={liked ? "currentColor" : "none"} /></button>}
        {onAdd && <button aria-label={`Add ${track.title} to a playlist`} className="icon-button" onClick={onAdd} type="button"><Plus size={18} /></button>}
        {onMore && <button aria-label={`More actions for ${track.title}`} className="icon-button icon-button--more" onClick={onMore} type="button"><MoreHorizontal size={18} /></button>}
        <span className="track-row__duration">{formatDuration(track.durationSeconds)}</span>
        <button aria-label={`Play ${track.title}`} className="track-row__play" onClick={onPlay} type="button"><Play size={15} fill="currentColor" /></button>
      </div>
    </div>
  );
}
