"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { CharacterAlignmentResponseModel } from "@elevenlabs/elevenlabs-js/api/types/CharacterAlignmentResponseModel"
import { useTranscriptViewer } from "@/hooks/use-transcript-viewer"

interface TranscriptSyncContextValue {
  alignment: CharacterAlignmentResponseModel | null
  currentWordIndex: number
  words: Array<{ text: string; startTime: number; endTime: number }>
  audioRef: React.RefObject<HTMLAudioElement>
  isLoading: boolean
  error: string | null
  isPlaying: boolean
}

const TranscriptSyncContext = createContext<TranscriptSyncContextValue | null>(
  null
)

export function useTranscriptSync() {
  const context = useContext(TranscriptSyncContext)
  if (!context) {
    throw new Error(
      "useTranscriptSync must be used within a TranscriptSyncProvider"
    )
  }
  return context
}

interface TranscriptSyncProviderProps {
  children: React.ReactNode
}

export function TranscriptSyncProvider({
  children,
}: TranscriptSyncProviderProps) {
  const [alignment, setAlignment] =
    useState<CharacterAlignmentResponseModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    async function loadAlignment() {
      try {
        const response = await fetch("/letter-alignment.json")
        if (!response.ok) {
          setAlignment(null)
          setIsLoading(false)
          return
        }
        const data = await response.json()
        setAlignment(data)
      } catch (err) {
        setAlignment(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadAlignment()
  }, [])

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio("/letter-audio.mp3")
      audio.preload = "auto"
      audioRef.current = audio
    }
  }, [])

  const viewerState = useTranscriptViewer({
    alignment: alignment ?? null,
    hideAudioTags: true,
    audioRef,
  })

  const value: TranscriptSyncContextValue = {
    alignment,
    currentWordIndex: viewerState.currentWordIndex,
    words: viewerState.words.map((w) => ({
      text: w.text,
      startTime: w.startTime,
      endTime: w.endTime,
    })),
    audioRef,
    isLoading,
    error,
    isPlaying: viewerState.isPlaying,
  }

  return (
    <TranscriptSyncContext.Provider value={value}>
      {children}
    </TranscriptSyncContext.Provider>
  )
}
