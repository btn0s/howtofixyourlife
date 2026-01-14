"use client"

import { useEffect, useState } from "react"
import type { CharacterAlignmentResponseModel } from "@elevenlabs/elevenlabs-js/api/types/CharacterAlignmentResponseModel"
import {
  TranscriptViewerContainer,
  TranscriptViewerAudio,
  TranscriptViewerWords,
  TranscriptViewerPlayPauseButton,
  TranscriptViewerScrubBar,
} from "@/components/ui/transcript-viewer"

export function LetterTranscriptViewer() {
  const [alignment, setAlignment] =
    useState<CharacterAlignmentResponseModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAlignment() {
      try {
        const response = await fetch("/letter-alignment.json")
        if (!response.ok) {
          throw new Error("Failed to load alignment data")
        }
        const data = await response.json()
        setAlignment(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    loadAlignment()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading transcript...</div>
      </div>
    )
  }

  if (error || !alignment) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">
          {error || "Failed to load alignment data"}
        </div>
      </div>
    )
  }

  return (
    <TranscriptViewerContainer
      audioSrc="/letter-audio.mp3"
      audioType="audio/mpeg"
      alignment={alignment}
      className="max-w-4xl mx-auto"
    >
      <TranscriptViewerAudio />
      <div className="flex items-center gap-3 mb-4">
        <TranscriptViewerPlayPauseButton />
        <TranscriptViewerScrubBar />
      </div>
      <TranscriptViewerWords className="prose prose-lg max-w-none" />
    </TranscriptViewerContainer>
  )
}
