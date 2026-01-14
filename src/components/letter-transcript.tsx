"use client"

import { useMemo, useEffect, useRef, memo } from "react"
import { useTranscriptSync } from "./transcript-sync-provider"
import { letterBlocks, type LetterBlock, type Token } from "@/generated/letter"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import danKoeAvatar from "@/assets/dan-koe-avatar.png"

const WordSpan = memo(
  ({
    word,
    wordIndex,
    isCurrent,
    isUnspoken,
    wordRefs,
  }: {
    word: string
    wordIndex: number
    isCurrent: boolean
    isUnspoken: boolean
    wordRefs: React.MutableRefObject<Map<number, HTMLElement>> | null | undefined
  }) => {
    const className = isCurrent
      ? "bg-yellow-200 dark:bg-yellow-900 transition-colors duration-150"
      : isUnspoken
        ? "opacity-50 transition-colors duration-150"
        : "transition-colors duration-150"

    return (
      <span
        ref={
          wordRefs
            ? (el) => {
                if (!wordRefs.current) {
                  wordRefs.current = new Map()
                }
                if (el) {
                  wordRefs.current.set(wordIndex, el)
                } else {
                  wordRefs.current.delete(wordIndex)
                }
              }
            : undefined
        }
        className={className}
        data-word-index={wordIndex}
      >
        {word}
      </span>
    )
  },
  (prev, next) => {
    return (
      prev.isCurrent === next.isCurrent &&
      prev.isUnspoken === next.isUnspoken &&
      prev.word === next.word
    )
  }
)
WordSpan.displayName = "WordSpan"

function renderTokens(
  tokens: Token[],
  startWordIndex: number,
  currentWordIndex: number,
  isPlaying: boolean,
  wordRefs: React.MutableRefObject<Map<number, HTMLElement>> | null | undefined
): React.ReactNode {
  let wordIndex = startWordIndex
  const elements: React.ReactNode[] = []

  for (const token of tokens) {
    if (token.type === "word") {
      // Only highlight if we have a valid currentWordIndex (not -1)
      // When currentWordIndex is -1 (in a gap), don't mark words as unspoken
      const isCurrent = isPlaying && currentWordIndex >= 0 && currentWordIndex === wordIndex
      const isUnspoken = isPlaying && currentWordIndex >= 0 && currentWordIndex < wordIndex

      elements.push(
        <WordSpan
          key={`word-${wordIndex}`}
          word={token.text}
          wordIndex={wordIndex}
          isCurrent={isCurrent}
          isUnspoken={isUnspoken}
          wordRefs={wordRefs}
        />
      )
      wordIndex++
    } else {
      elements.push(token.text)
    }
  }

  return <>{elements}</>
}

export function LetterTranscript() {
  const { currentWordIndex, isPlaying, alignment } = useTranscriptSync()
  const wordRefs = useRef<Map<number, HTMLElement>>(new Map())

  const lastScrolledIndex = useRef(-1)
  useEffect(() => {
    if (!isPlaying || currentWordIndex < 0) return

    if (Math.abs(currentWordIndex - lastScrolledIndex.current) < 3) {
      return
    }

    const wordElement = wordRefs.current.get(currentWordIndex)
    if (wordElement) {
      lastScrolledIndex.current = currentWordIndex
      const timeoutId = setTimeout(() => {
        wordElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      }, 200)

      return () => clearTimeout(timeoutId)
    }
  }, [currentWordIndex, isPlaying])

  const blocksWithOffsets = useMemo(() => {
    if (!alignment) return []

    let wordIndex = 0
    const result: Array<{ block: LetterBlock; startWordIndex: number }> = []

    for (const block of letterBlocks) {
      if (block.type === "html") {
        result.push({ block, startWordIndex: wordIndex })
        continue
      }

      if (block.type === "list") {
        const totalWords = block.items.reduce(
          (sum, item) => sum + item.filter((t) => t.type === "word").length,
          0
        )
        result.push({ block, startWordIndex: wordIndex })
        wordIndex += totalWords
        continue
      }

      const tokens = block.tokens || []
      const wordCount = tokens.filter((t) => t.type === "word").length
      result.push({ block, startWordIndex: wordIndex })
      wordIndex += wordCount
    }

    return result
  }, [alignment])

  if (!alignment) {
    return (
      <>
        {letterBlocks.map((block, idx) => {
          if (block.type === "heading") {
            const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements
            return (
              <HeadingTag key={idx}>
                {block.tokens.map((t) => t.text).join("")}
              </HeadingTag>
            )
          }
          if (block.type === "paragraph") {
            return (
              <p key={idx}>{block.tokens.map((t) => t.text).join("")}</p>
            )
          }
          if (block.type === "blockquote") {
            return (
              <blockquote key={idx}>
                {block.tokens.map((t) => t.text).join("")}
              </blockquote>
            )
          }
          if (block.type === "list") {
            const ListTag = block.ordered ? "ol" : "ul"
            return (
              <ListTag key={idx}>
                {block.items.map((item, i) => (
                  <li key={i}>{item.map((t) => t.text).join("")}</li>
                ))}
              </ListTag>
            )
          }
          if (block.type === "html") {
            if (block.content === "avatar" || block.content.includes("Avatar")) {
              return (
                <div key={idx} className="flex items-center gap-3 my-6">
                  <Avatar className="size-10 border border-border">
                    <AvatarImage src={danKoeAvatar} alt="Dan Koe" priority />
                    <AvatarFallback>DK</AvatarFallback>
                  </Avatar>
                  <span className="text-lg font-medium">DAN KOE</span>
                </div>
              )
            }
            return null
          }
          return null
        })}
      </>
    )
  }

  return (
    <>
      {blocksWithOffsets.map(({ block, startWordIndex }, idx) => {
        if (block.type === "heading") {
          const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements
          return (
            <HeadingTag key={idx}>
              {renderTokens(
                block.tokens,
                startWordIndex,
                currentWordIndex,
                isPlaying,
                wordRefs
              )}
            </HeadingTag>
          )
        }

        if (block.type === "paragraph") {
          return (
            <p key={idx}>
              {renderTokens(
                block.tokens,
                startWordIndex,
                currentWordIndex,
                isPlaying,
                wordRefs
              )}
            </p>
          )
        }

        if (block.type === "blockquote") {
          return (
            <blockquote key={idx}>
              {renderTokens(
                block.tokens,
                startWordIndex,
                currentWordIndex,
                isPlaying,
                wordRefs
              )}
            </blockquote>
          )
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul"
          let itemWordIndex = startWordIndex
          return (
            <ListTag key={idx}>
              {block.items.map((item, i) => {
                const itemStartIndex = itemWordIndex
                const wordCount = item.filter((t) => t.type === "word").length
                const rendered = renderTokens(
                  item,
                  itemStartIndex,
                  currentWordIndex,
                  isPlaying,
                  wordRefs
                )
                itemWordIndex += wordCount
                return <li key={i}>{rendered}</li>
              })}
            </ListTag>
          )
        }

        if (block.type === "html") {
          if (block.content === "avatar" || block.content.includes("Avatar")) {
            return (
              <div key={idx} className="flex items-center gap-3 my-6">
                <Avatar className="size-10 border border-border">
                  <AvatarImage src={danKoeAvatar} alt="Dan Koe" priority />
                  <AvatarFallback>DK</AvatarFallback>
                </Avatar>
                <span className="text-lg font-medium">DAN KOE</span>
              </div>
            )
          }
          return null
        }

        return null
      })}
    </>
  )
}
