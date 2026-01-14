"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CharacterAlignmentResponseModel } from "@elevenlabs/elevenlabs-js/api/types/CharacterAlignmentResponseModel"

export type TranscriptWord = {
  kind: "word"
  text: string
  startTime: number
  endTime: number
  segmentIndex: number
  characterStartIndex: number
  characterEndIndex: number
}

export type TranscriptGap = {
  kind: "gap"
  text: string
  segmentIndex: number
  characterStartIndex: number
  characterEndIndex: number
}

export type TranscriptSegment = TranscriptWord | TranscriptGap

export type SegmentComposer = (
  segments: TranscriptSegment[]
) => TranscriptSegment[]

export interface UseTranscriptViewerResult {
  audioRef: React.RefObject<HTMLAudioElement>
  alignment: CharacterAlignmentResponseModel | null
  segments: TranscriptSegment[]
  words: TranscriptWord[]
  spokenSegments: TranscriptSegment[]
  unspokenSegments: TranscriptSegment[]
  currentWord: TranscriptWord | null
  currentSegmentIndex: number
  currentWordIndex: number
  duration: number
  currentTime: number
  isPlaying: boolean
  isScrubbing: boolean
  play: () => void
  pause: () => void
  seekToTime: (time: number) => void
  seekToWord: (word: TranscriptWord) => void
  startScrubbing: () => void
  endScrubbing: () => void
}

interface UseTranscriptViewerOptions {
  alignment: CharacterAlignmentResponseModel | null
  segmentComposer?: SegmentComposer
  hideAudioTags?: boolean
  audioRef?: React.RefObject<HTMLAudioElement>
  onPlay?: () => void
  onPause?: () => void
  onTimeUpdate?: (time: number) => void
  onEnded?: () => void
  onDurationChange?: (duration: number) => void
}

export function useTranscriptViewer({
  alignment,
  segmentComposer,
  hideAudioTags = true,
  audioRef: externalAudioRef,
  onPlay,
  onPause,
  onTimeUpdate,
  onEnded,
  onDurationChange,
}: UseTranscriptViewerOptions): UseTranscriptViewerResult {
  const internalAudioRef = useRef<HTMLAudioElement>(null)
  const audioRef = externalAudioRef ?? internalAudioRef
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)

  const segments = useMemo(() => {
    if (!alignment?.characters?.length) return []

    const { characters, characterStartTimesSeconds, characterEndTimesSeconds } = alignment
    const result: TranscriptSegment[] = []
    let wordStartIndex = 0
    let segmentIndex = 0

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i]
      const isSpace = char === " " || char === "\n" || char === "\t"
      const isTagStart = char === "["
      const isTagEnd = char === "]"

      if (hideAudioTags && isTagStart) {
        let j = i + 1
        while (j < characters.length && characters[j] !== "]") {
          j++
        }
        if (j < characters.length) {
          if (wordStartIndex < i) {
            const wordText = characters.slice(wordStartIndex, i).join("")
            const startTime = characterStartTimesSeconds[wordStartIndex] ?? 0
            const endTime = characterEndTimesSeconds[i - 1] ?? 0

            if (wordText.trim().length > 0) {
              result.push({
                kind: "word",
                text: wordText.trim(),
                startTime,
                endTime,
                segmentIndex: segmentIndex++,
                characterStartIndex: wordStartIndex,
                characterEndIndex: i - 1,
              })
            }
          }

          result.push({
            kind: "gap",
            text: characters.slice(i, j + 1).join(""),
            segmentIndex: segmentIndex++,
            characterStartIndex: i,
            characterEndIndex: j,
          })

          i = j
          wordStartIndex = j + 1
          continue
        }
      }

      if (isSpace) {
        if (wordStartIndex < i) {
          const wordText = characters.slice(wordStartIndex, i).join("")
          const startTime = characterStartTimesSeconds[wordStartIndex] ?? 0
          const endTime = characterEndTimesSeconds[i - 1] ?? 0

          if (wordText.trim().length > 0) {
            result.push({
              kind: "word",
              text: wordText.trim(),
              startTime,
              endTime,
              segmentIndex: segmentIndex++,
              characterStartIndex: wordStartIndex,
              characterEndIndex: i - 1,
            })
          }
        }

        const gapText = char
        result.push({
          kind: "gap",
          text: gapText,
          segmentIndex: segmentIndex++,
          characterStartIndex: i,
          characterEndIndex: i,
        })

        wordStartIndex = i + 1
      }
    }

    if (wordStartIndex < characters.length) {
      const wordText = characters.slice(wordStartIndex).join("")
      const startTime = characterStartTimesSeconds[wordStartIndex] ?? 0
      const endTime =
        characterEndTimesSeconds[characters.length - 1] ?? 0

      if (wordText.trim().length > 0) {
        result.push({
          kind: "word",
          text: wordText.trim(),
          startTime,
          endTime,
          segmentIndex: segmentIndex++,
          characterStartIndex: wordStartIndex,
          characterEndIndex: characters.length - 1,
        })
      }
    }

    return segmentComposer ? segmentComposer(result) : result
  }, [alignment, hideAudioTags, segmentComposer])

  const words = useMemo(
    () => segments.filter((s): s is TranscriptWord => s.kind === "word"),
    [segments]
  )

  const currentWord = useMemo(() => {
    if (isScrubbing) return null
    if (words.length === 0) return null

    // Find the word that contains currentTime
    for (const word of words) {
      if (currentTime >= word.startTime && currentTime <= word.endTime) {
        return word
      }
    }

    // If past all words, return last word
    if (currentTime > words[words.length - 1].endTime) {
      return words[words.length - 1]
    }

    // If before first word, return null
    if (currentTime < words[0].startTime) {
      return null
    }

    // If in a gap between words, find the most recent word that ended
    // This prevents flickering when audio is between words by keeping
    // the last word highlighted during short gaps
    let lastWord = null
    
    for (const word of words) {
      if (word.endTime <= currentTime) {
        lastWord = word
      } else {
        break
      }
    }

    return lastWord
  }, [currentTime, words, isScrubbing])

  const currentWordIndex = useMemo(() => {
    if (!currentWord) return -1
    return words.findIndex((w) => w.segmentIndex === currentWord.segmentIndex)
  }, [currentWord, words])

  const currentSegmentIndex = useMemo(() => {
    if (!currentWord) return -1
    return currentWord.segmentIndex
  }, [currentWord])

  const spokenSegments = useMemo(() => {
    if (!currentWord) return []
    return segments.filter(
      (s) => s.segmentIndex < currentWord.segmentIndex && s.kind === "word"
    )
  }, [segments, currentWord])

  const unspokenSegments = useMemo(() => {
    if (!currentWord) return segments.filter((s) => s.kind === "word")
    return segments.filter(
      (s) => s.segmentIndex > currentWord.segmentIndex && s.kind === "word"
    )
  }, [segments, currentWord])

  const lastUpdateTimeRef = useRef(0)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      const checkAudio = setInterval(() => {
        if (audioRef.current) {
          clearInterval(checkAudio)
          setCurrentTime(0)
        }
      }, 100)
      return () => clearInterval(checkAudio)
    }

    const handleTimeUpdate = () => {
      if (!isScrubbing) {
        const now = Date.now()
        if (now - lastUpdateTimeRef.current >= 50) {
          const newTime = audio.currentTime
          setCurrentTime(newTime)
          onTimeUpdate?.(newTime)
          lastUpdateTimeRef.current = now
        }
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      onDurationChange?.(audio.duration)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }

    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      onEnded?.()
    }

    if (audio.readyState >= 2) {
      setDuration(audio.duration)
    }
    setIsPlaying(!audio.paused)

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      const currentAudio = audioRef.current
      if (currentAudio) {
        currentAudio.removeEventListener("timeupdate", handleTimeUpdate)
        currentAudio.removeEventListener("loadedmetadata", handleLoadedMetadata)
        currentAudio.removeEventListener("play", handlePlay)
        currentAudio.removeEventListener("pause", handlePause)
        currentAudio.removeEventListener("ended", handleEnded)
      }
    }
  }, [isScrubbing, onPlay, onPause, onTimeUpdate, onEnded, onDurationChange, audioRef])

  const play = useCallback(() => {
    audioRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const seekToTime = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, Math.min(time, duration))
        setCurrentTime(audioRef.current.currentTime)
      }
    },
    [duration]
  )

  const seekToWord = useCallback(
    (word: TranscriptWord) => {
      seekToTime(word.startTime)
    },
    [seekToTime]
  )

  const startScrubbing = useCallback(() => {
    setIsScrubbing(true)
  }, [])

  const endScrubbing = useCallback(() => {
    setIsScrubbing(false)
  }, [])

  return {
    audioRef,
    alignment: alignment ?? null,
    segments,
    words,
    spokenSegments,
    unspokenSegments,
    currentWord,
    currentSegmentIndex,
    currentWordIndex,
    duration,
    currentTime,
    isPlaying,
    isScrubbing,
    play,
    pause,
    seekToTime,
    seekToWord,
    startScrubbing,
    endScrubbing,
  }
}
