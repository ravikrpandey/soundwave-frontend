import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_PREVIEW_VOLUME, PREVIEW_MASTER_GAIN, PREVIEW_OUTPUT_FLOOR, PREVIEW_VOICE_GAIN } from "@/lib/audioPreview";
import { nextQueueIndex, previousQueueIndex, queueAfterRemoval, RepeatMode } from "@/lib/playerQueue";
import { MusicTrack } from "@/types/music";

type PlayerContextValue = {
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  queueIndex: number;
  isPlaying: boolean;
  elapsed: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playTrack: (track: MusicTrack, trackList?: MusicTrack[]) => void;
  togglePlay: () => void;
  playPrevious: () => void;
  playNext: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  removeFromQueue: (trackId: string) => void;
  jumpToQueueIndex: (index: number) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

function noteFromId(id: string) {
  return 150 + Array.from(id).reduce((total, character) => total + character.charCodeAt(0), 0) % 170;
}

function previewVoice(context: AudioContext, output: GainNode, frequency: number, offset: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = offset % 2 ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(frequency * (offset % 3 === 0 ? 1 : 1.25), context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(PREVIEW_VOICE_GAIN, context.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.85);
  oscillator.connect(gain).connect(output);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.9);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(DEFAULT_PREVIEW_VOLUME);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const audioContext = useRef<AudioContext | null>(null);
  const soundInterval = useRef<number | null>(null);
  const soundOutput = useRef<GainNode | null>(null);
  const streamingAudio = useRef<HTMLAudioElement | null>(null);

  const startStreamFromGesture = useCallback((track: MusicTrack) => {
    if (!track.audioUrl) return;
    const active = streamingAudio.current;
    if (active?.dataset.soundwaveTrackId === track.id) {
      active.volume = volume;
      void active.play().catch(() => {
        setIsPlaying(false);
        toast.error("This live stream could not start. Please try another track.");
      });
      return;
    }
    active?.pause();
    const audio = new Audio(track.audioUrl);
    audio.preload = "auto";
    audio.volume = volume;
    audio.dataset.soundwaveTrackId = track.id;
    streamingAudio.current = audio;
    void audio.play().catch(() => {
      if (streamingAudio.current === audio) {
        setIsPlaying(false);
        toast.error("This live stream could not start. Please try another track.");
      }
    });
  }, [volume]);

  const stopPreview = useCallback(() => {
    if (soundInterval.current !== null) window.clearInterval(soundInterval.current);
    soundInterval.current = null;
    soundOutput.current?.disconnect();
    soundOutput.current = null;
  }, []);

  const playNext = useCallback(() => {
    if (!queue.length) return;
    const nextIndex = nextQueueIndex({ length: queue.length, currentIndex: queueIndex, shuffle, repeat });
    if (nextIndex !== null) {
      startStreamFromGesture(queue[nextIndex]);
      setQueueIndex(nextIndex);
      setCurrentTrack(queue[nextIndex]);
      setElapsed(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex, repeat, shuffle, startStreamFromGesture]);

  const playPrevious = useCallback(() => {
    if (!currentTrack) return;
    if (elapsed > 4) {
      if (streamingAudio.current) streamingAudio.current.currentTime = 0;
      startStreamFromGesture(currentTrack);
      setElapsed(0);
      return;
    }
    const previousIndex = previousQueueIndex({ length: queue.length, currentIndex: queueIndex, repeat });
    if (previousIndex !== null && queue[previousIndex]) {
      startStreamFromGesture(queue[previousIndex]);
      setQueueIndex(previousIndex);
      setCurrentTrack(queue[previousIndex]);
      setElapsed(0);
      setIsPlaying(true);
    }
  }, [currentTrack, elapsed, queue, queueIndex, repeat, startStreamFromGesture]);

  const playTrack = useCallback((track: MusicTrack, trackList?: MusicTrack[]) => {
    startStreamFromGesture(track);
    const nextQueue = trackList?.length ? trackList : queue.length ? queue : [track];
    const index = Math.max(0, nextQueue.findIndex(item => item.id === track.id));
    setQueue(nextQueue);
    setQueueIndex(index);
    setCurrentTrack(track);
    setElapsed(0);
    setIsPlaying(true);
  }, [queue, startStreamFromGesture]);

  const togglePlay = useCallback(() => {
    if (!currentTrack && queue[0]) {
      setCurrentTrack(queue[0]);
      setQueueIndex(0);
      setElapsed(0);
    }
    if (streamingAudio.current && !isPlaying) {
      void streamingAudio.current.play().catch(() => {
        setIsPlaying(false);
        toast.error("This live stream could not resume. Please try another track.");
      });
    }
    setIsPlaying(playing => !playing);
  }, [currentTrack, isPlaying, queue]);

  const jumpToQueueIndex = useCallback((index: number) => {
    if (!queue[index]) return;
    startStreamFromGesture(queue[index]);
    setQueueIndex(index);
    setCurrentTrack(queue[index]);
    setElapsed(0);
    setIsPlaying(true);
  }, [queue, startStreamFromGesture]);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue(items => {
      const next = queueAfterRemoval(items, queueIndex, trackId);
      setQueueIndex(next.currentIndex);
      if (next.currentIndex === -1) {
        setCurrentTrack(null);
        setIsPlaying(false);
      } else if (next.queue[next.currentIndex]?.id !== currentTrack?.id) {
        setCurrentTrack(next.queue[next.currentIndex]);
        setElapsed(0);
      }
      return next.queue;
    });
  }, [currentTrack?.id, queueIndex]);

  useEffect(() => {
    if (!isPlaying || !currentTrack || currentTrack.audioUrl) return;
    const timer = window.setInterval(() => {
      setElapsed(seconds => {
        if (seconds + 1 < currentTrack.durationSeconds) return seconds + 1;
        if (repeat === "one") return 0;
        window.setTimeout(playNext, 0);
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentTrack, isPlaying, playNext, repeat]);

  useEffect(() => {
    if (!currentTrack?.audioUrl) return;
    const preparedAudio = streamingAudio.current;
    const audio = preparedAudio?.dataset.soundwaveTrackId === currentTrack.id ? preparedAudio : new Audio(currentTrack.audioUrl);
    audio.preload = "auto";
    audio.volume = volume;
    audio.dataset.soundwaveTrackId = currentTrack.id;
    const syncProgress = () => setElapsed(Math.floor(audio.currentTime));
    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setElapsed(Math.floor(audio.currentTime));
    };
    const handleEnd = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      playNext();
    };
    const handleError = () => {
      console.warn("[Audio] Audius stream could not be played");
      setIsPlaying(false);
      toast.error("This live stream could not be played. Please try another track.");
    };
    audio.addEventListener("timeupdate", syncProgress);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("ended", handleEnd);
    audio.addEventListener("error", handleError);
    streamingAudio.current = audio;
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", syncProgress);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("ended", handleEnd);
      audio.removeEventListener("error", handleError);
      if (streamingAudio.current === audio) streamingAudio.current = null;
    };
  }, [currentTrack?.audioUrl, currentTrack?.id, playNext, repeat]);

  useEffect(() => {
    const audio = streamingAudio.current;
    if (!audio) return;
    audio.volume = volume;
    if (isPlaying) {
      void audio.play().catch(() => {
        setIsPlaying(false);
        toast.error("This live stream could not resume. Please try another track.");
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, volume]);

  useEffect(() => {
    stopPreview();
    if (!isPlaying || !currentTrack || currentTrack.audioUrl) return;
    const context = audioContext.current ?? new window.AudioContext();
    audioContext.current = context;
    void context.resume();
    const output = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.2;
    output.gain.value = Math.max(PREVIEW_OUTPUT_FLOOR, volume) * PREVIEW_MASTER_GAIN;
    output.connect(compressor).connect(context.destination);
    soundOutput.current = output;
    const root = noteFromId(currentTrack.id);
    let chordStep = 0;
    const playChord = () => {
      previewVoice(context, output, root, chordStep);
      previewVoice(context, output, root * 1.5, chordStep + 1);
      if (chordStep % 2 === 0) previewVoice(context, output, root * 2, chordStep + 2);
      chordStep += 1;
    };
    playChord();
    soundInterval.current = window.setInterval(playChord, 1050);
    return stopPreview;
  }, [currentTrack, isPlaying, stopPreview, volume]);

  useEffect(() => () => {
    stopPreview();
    void audioContext.current?.close();
  }, [stopPreview]);

  const value = useMemo<PlayerContextValue>(() => ({
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    elapsed,
    volume,
    shuffle,
    repeat,
    playTrack,
    togglePlay,
    playPrevious,
    playNext,
    seek: seconds => {
      setElapsed(seconds);
      if (streamingAudio.current) streamingAudio.current.currentTime = seconds;
    },
    setVolume,
    toggleShuffle: () => setShuffle(value => !value),
    toggleRepeat: () => setRepeat(value => value === "off" ? "all" : value === "all" ? "one" : "off"),
    removeFromQueue,
    jumpToQueueIndex,
  }), [currentTrack, elapsed, isPlaying, jumpToQueueIndex, playNext, playPrevious, playTrack, queue, queueIndex, removeFromQueue, repeat, shuffle, togglePlay, volume]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
