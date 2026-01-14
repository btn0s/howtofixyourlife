"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";

const BOUNCE_VARIANTS = {
  idle: 0.25,
  "idle-player": 0.25,
  "player-idle": 0.25,
};

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/letter-audio.mp3");
      audioRef.current.preload = "auto";
    }

    const audio = audioRef.current;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, []);

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

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(
      0,
      Math.min(audioRef.current.currentTime + seconds, duration)
    );
    audioRef.current.currentTime = newTime;
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
  };

  const idleContent = (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="text-sm font-medium">Listen to this letter</span>
      <Play className="size-4" />
    </div>
  );

  const playerContent = (
    <div className="flex items-center gap-3 px-4 py-2 w-full max-w-md">
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleSkip(-10)}
          disabled={!duration}
          className="h-7 w-7"
        >
          <SkipBack className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handlePlayPause}
          disabled={isLoading}
          className="h-7 w-7"
        >
          {isLoading ? (
            <div className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleSkip(10)}
          disabled={!duration}
          className="h-7 w-7"
        >
          <SkipForward className="size-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground shrink-0 font-mono w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="w-32"
        />
        <span className="text-xs text-muted-foreground shrink-0 font-mono w-10">
          {formatTime(duration)}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleMinimize}
        className="h-7 w-7 shrink-0"
      >
        <X className="size-3.5" />
      </Button>
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
        className="pointer-events-auto mx-auto w-fit min-w-[100px] overflow-hidden rounded-full bg-black text-white shadow-lg"
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
