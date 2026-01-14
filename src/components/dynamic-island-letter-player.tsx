"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Play,
  Pause,
  X,
} from "lucide-react";
import { useTranscriptSync } from "./transcript-sync-provider";

const BOUNCE_VARIANTS = {
  idle: 0.25,
  "idle-player": 0.25,
  "player-idle": 0.25,
};

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function WaveformIndicator({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-center gap-1 h-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-0.5 bg-current rounded-full"
          initial={{ height: 4 }}
          animate={
            isPlaying
              ? {
                  height: [4, 12, 4, 8, 4],
                  transition: {
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut",
                  },
                }
              : { height: 4 }
          }
        />
      ))}
    </div>
  );
}

export default function DynamicIslandLetterPlayer() {
  const [view, setView] = useState<"idle" | "player">("idle");
  const [variantKey, setVariantKey] =
    useState<keyof typeof BOUNCE_VARIANTS>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(1);

  const { audioRef, isPlaying } = useTranscriptSync();
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (isPlaying) {
      setIsLoading(false);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const updateTime = () => {
      if (isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const updateDuration = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      updateDuration();
    };

    const handleTimeUpdate = () => {
      updateTime();
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      updateDuration();
    };

    const handlePlay = () => {
      setIsLoading(false);
    };

    updateDuration();
    if (isPlaying) {
      updateTime();
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);

    const interval = setInterval(() => {
      updateDuration();
      if (isPlaying) {
        updateTime();
      }
    }, 250);

    return () => {
      clearInterval(interval);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("play", handlePlay);
    };
  }, [audioRef, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleIdleClick = () => {
    setVariantKey("idle-player");
    setView("player");
    setIsLoading(true);
    if (audioRef.current) {
      audioRef.current.play().catch(() => {
        setIsLoading(false);
      }).then(() => {
        setIsLoading(false);
      });
    }
  };

  const handleMinimize = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setVariantKey("player-idle");
    setView("idle");
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(percent * duration, duration));
    audioRef.current.currentTime = newTime;
  };

  const idleContent = (
    <div className="flex items-center gap-2.5 px-5 py-2.5">
      <span className="text-sm font-medium text-white tracking-tight">Listen to this letter</span>
      <div className="flex items-center justify-center size-7 rounded-full bg-white/15 border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_1px_2px_0_rgba(0,0,0,0.3)]">
        <Play className="size-3.5 fill-white text-white ml-0.5" />
      </div>
    </div>
  );

  const playerContent = (
    <div className="flex items-center gap-2 px-4 py-2 w-full max-w-md">
      <button
        onClick={handlePlayPause}
        disabled={isLoading}
        className="h-9 w-9 shrink-0 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center border border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_2px_4px_0_rgba(0,0,0,0.4)] active:shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.3)]"
      >
        {isLoading ? (
          <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="size-4 fill-white text-white" />
        ) : (
          <Play className="size-4 fill-white text-white" />
        )}
      </button>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-white/90 shrink-0 font-mono w-10 text-right font-medium">
          {formatTime(currentTime)}
        </span>
        <div
          className="relative w-16 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.3)] cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-full bg-white rounded-full shadow-[0_0_4px_0_rgba(255,255,255,0.5)] transition-all group-hover:shadow-[0_0_6px_0_rgba(255,255,255,0.7)]"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-white/90 shrink-0 font-mono w-10 font-medium">
          {formatTime(duration)}
        </span>
      </div>

      <button
        onClick={handleMinimize}
        className="h-8 w-8 shrink-0 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/15 transition-all duration-200 flex items-center justify-center border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] active:shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.2)]"
      >
        <X className="size-4 fill-white text-white" />
      </button>
    </div>
  );

  const content = useMemo(() => {
    switch (view) {
      case "player":
        return playerContent;
      case "idle":
        return idleContent;
    }
  }, [view, isPlaying, isLoading, currentTime, duration]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <motion.div
        layout
        transition={{
          type: "spring",
          bounce: BOUNCE_VARIANTS[variantKey] ?? 0.25,
          stiffness: 400,
          damping: 30,
        }}
        style={{ borderRadius: 32 }}
        className="pointer-events-auto mx-auto w-fit min-w-[100px] overflow-hidden rounded-full bg-zinc-900 text-white shadow-lg border border-white/10"
        onClick={view === "idle" ? handleIdleClick : undefined}
        role={view === "idle" ? "button" : undefined}
        tabIndex={view === "idle" ? 0 : undefined}
        onKeyDown={
          view === "idle"
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleIdleClick();
                }
              }
            : undefined
        }
      >
        <motion.div
          transition={{
            type: "spring",
            bounce: BOUNCE_VARIANTS[variantKey] ?? 0.25,
            stiffness: 400,
            damping: 30,
          }}
          initial={{
            scale: 0.9,
            opacity: 0,
            filter: "blur(5px)",
            originX: 0.5,
            originY: 0.5,
          }}
          animate={{
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            originX: 0.5,
            originY: 0.5,
            transition: {
              delay: 0.02,
            },
          }}
          key={view}
        >
          {content}
        </motion.div>
      </motion.div>
    </div>
  );
}
