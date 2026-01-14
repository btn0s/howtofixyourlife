import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkMdx from "remark-mdx"
import { visit } from "unist-util-visit"

type LetterBlock =
  | { type: "heading"; level: number; tokens: Token[] }
  | { type: "paragraph"; tokens: Token[] }
  | { type: "blockquote"; tokens: Token[] }
  | { type: "list"; ordered: boolean; items: Token[][] }
  | { type: "html"; content: string } // For JSX like Avatar component

type Token = { type: "word"; text: string } | { type: "space"; text: string }

function tokenizeText(text: string): Token[] {
  const tokens: Token[] = []
  const parts = text.split(/(\s+)/)

  for (const part of parts) {
    if (part.trim()) {
      tokens.push({ type: "word", text: part })
    } else if (part) {
      tokens.push({ type: "space", text: part })
    }
  }

  return tokens
}

function extractTextFromNode(node: any): string {
  let text = ""

  if (node.type === "text") {
    return node.value || ""
  }

  if (node.children) {
    for (const child of node.children) {
      text += extractTextFromNode(child)
    }
  }

  return text
}

async function extractLetter() {
  const contentPath = join(process.cwd(), "src/app/content.mdx")
  const outputPath = join(process.cwd(), "src/generated/letter.ts")

  console.log("Reading content.mdx...")
  const content = readFileSync(contentPath, "utf-8")

  console.log("Parsing MDX...")
  const processor = unified().use(remarkParse).use(remarkMdx)
  const tree = processor.parse(content)

  const blocks: LetterBlock[] = []
  let plainTextParts: string[] = []
  let wordIndex = 0
  let avatarBlockAdded = false // Track if we've already added the avatar block
  let skipNextParagraph = false // Track if we should skip the next paragraph (it's avatar text)

  // Skip the imports at the top
  let skipImports = true

  visit(tree, (node: any) => {
    // Skip import statements
    if (node.type === "mdxjsEsm" && skipImports) {
      return
    }
    if (node.type !== "mdxjsEsm") {
      skipImports = false
    }
    if (skipImports) {
      return
    }

    // Skip text nodes that are children of JSX elements (they'll be handled by the parent)
    if (node.type === "text" && node.parent?.type === "mdxJsxTextElement") {
      return
    }

    // Skip text nodes inside Avatar component or div wrapper
    if (node.type === "text") {
      const parent = node.parent
      if (
        parent?.type === "mdxJsxFlowElement" &&
        (parent?.name === "div" || parent?.name === "Avatar" || parent?.name === "span")
      ) {
        return
      }
      // Also skip if the text is "DK" or "DAN KOE"
      if (node.value === "DK" || node.value === "DAN KOE" || node.value?.includes("DAN KOE")) {
        return
      }
    }

    // Skip child nodes of JSX elements we've already processed
    if (
      node.parent?.type === "mdxJsxFlowElement" &&
      (node.parent?.name === "div" || node.parent?.name === "Avatar" || node.parent?.name === "span")
    ) {
      return
    }

    // Handle headings
    if (node.type === "heading") {
      const text = extractTextFromNode(node)
      const tokens = tokenizeText(text)
      blocks.push({ type: "heading", level: node.depth, tokens })
      plainTextParts.push(text)
      return
    }

    // Handle paragraphs
    if (node.type === "paragraph") {
      const text = extractTextFromNode(node)
      const trimmed = text.trim()
      // Skip paragraphs that are part of the Avatar component
      // Check for various patterns: "DK", "DAN KOE", "DKDAN KOE", etc.
      const isAvatarText =
        trimmed === "DK" ||
        trimmed === "KOE" ||
        trimmed === "DAN KOE" ||
        trimmed.includes("DKDAN") ||
        trimmed.match(/^D[A-Z]*\s*K[A-Z]*$/) // Matches "DK", "DAN KOE", etc.
      
      // Skip if it's avatar text OR if we just added an avatar block
      if (skipNextParagraph && isAvatarText) {
        skipNextParagraph = false
        return
      }
      
      if (trimmed && !isAvatarText) {
        const tokens = tokenizeText(text)
        blocks.push({ type: "paragraph", tokens })
        plainTextParts.push(text)
      }
      skipNextParagraph = false
      return
    }

    // Handle blockquotes
    if (node.type === "blockquote") {
      const text = extractTextFromNode(node)
      if (text.trim()) {
        const tokens = tokenizeText(text)
        blocks.push({ type: "blockquote", tokens })
        plainTextParts.push(text)
      }
      return
    }

    // Handle lists
    if (node.type === "list") {
      const items: Token[][] = []
      for (const item of node.children || []) {
        const itemText = extractTextFromNode(item)
        if (itemText.trim()) {
          items.push(tokenizeText(itemText))
          plainTextParts.push(itemText)
        }
      }
      if (items.length > 0) {
        blocks.push({
          type: "list",
          ordered: node.ordered || false,
          items,
        })
      }
      return
    }

    // Handle HTML/JSX (like the Avatar component)
    if (node.type === "html" || node.type === "mdxJsxFlowElement") {
      // Check if this is the Avatar component section
      const nodeValue = node.value || ""
      const nodeName = node.name || ""
      const hasAvatar = nodeName === "Avatar" || nodeValue.includes("Avatar")
      const hasDanKoe = nodeValue.includes("DAN KOE")
      
      // Only add avatar block once, and only for the parent div wrapper
      if (
        (nodeName === "div" && (hasAvatar || hasDanKoe)) ||
        (nodeName === "Avatar" && !avatarBlockAdded)
      ) {
        if (!avatarBlockAdded) {
          // Store as HTML block - we'll render the Avatar component separately
          blocks.push({ type: "html", content: "avatar" })
          avatarBlockAdded = true
          // Mark that we should skip the next paragraph if it contains avatar text
          skipNextParagraph = true
        }
        return
      }
      // For other HTML, extract text if any
      const text = extractTextFromNode(node)
      if (text.trim()) {
        const tokens = tokenizeText(text)
        blocks.push({ type: "paragraph", tokens })
        plainTextParts.push(text)
      }
      return
    }
  })

  // Remove avatar-related paragraphs from blocks and plainTextParts
  const filteredBlocks: LetterBlock[] = []
  const filteredPlainTextParts: string[] = []
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const isAvatarBlock = block.type === "html" && block.content === "avatar"
    
    // Skip paragraphs that are avatar-related (only check the text content, not position)
    if (block.type === "paragraph") {
      const text = block.tokens.map(t => t.text).join("").trim()
      const isAvatarText =
        text === "DK" ||
        text === "KOE" ||
        text === "DAN KOE" ||
        text.includes("DKDAN") ||
        text.match(/^D[A-Z]*\s*K[A-Z]*$/)
      
      if (isAvatarText) {
        continue // Skip this block only if it contains avatar text
      }
    }
    
    filteredBlocks.push(block)
    if (i < plainTextParts.length) {
      const text = plainTextParts[i]
      const trimmed = text.trim()
      const isAvatarText =
        trimmed === "DK" ||
        trimmed === "KOE" ||
        trimmed === "DAN KOE" ||
        trimmed.includes("DKDAN") ||
        trimmed.match(/^D[A-Z]*\s*K[A-Z]*$/)
      
      if (!isAvatarText) {
        filteredPlainTextParts.push(text)
      }
    }
  }

  const letterPlainText = filteredPlainTextParts.join("\n\n").trim()

  let letterExpressive = letterPlainText
  
  // Replace parentheses with commas so TTS will speak parenthetical text
  // ElevenLabs TTS skips parenthetical text, so we convert (text) to , text,
  letterExpressive = letterExpressive.replace(/\(/g, ", ")
  letterExpressive = letterExpressive.replace(/\)/g, "")
  
  // Clean up double commas and spaces
  letterExpressive = letterExpressive.replace(/,\s*,/g, ",")
  letterExpressive = letterExpressive.replace(/,\s+,\s+/g, ", ")
  letterExpressive = letterExpressive.replace(/\s+,\s+/g, ", ")
  
  // Add expressive tags at key points
  letterExpressive = letterExpressive.replace(
    /^How to fix your entire life in 1 day/,
    "[calm] How to fix your entire life in 1 day"
  )
  letterExpressive = letterExpressive.replace(
    /If you're anything like me, you think new years resolutions are stupid\./,
    "If you're anything like me, you think new years resolutions are stupid. [sighs]"
  )
  letterExpressive = letterExpressive.replace(
    /If you're one of these people, I'm not here to talk down on you\. I've quit 10x more goals than I've achieved\./,
    "If you're one of these people, I'm not here to talk down on you. I've quit 10x more goals than I've achieved. [chuckles]"
  )
  letterExpressive = letterExpressive.replace(
    /So whether you want to start the business/,
    "[thoughtful] So whether you want to start the business"
  )
  letterExpressive = letterExpressive.replace(
    /Let's begin\./,
    "[serious] Let's begin."
  )

  // Generate TypeScript file
  const output = `// This file is auto-generated by scripts/extract-letter.ts
// Do not edit manually

export type LetterBlock =
  | { type: "heading"; level: number; tokens: Token[] }
  | { type: "paragraph"; tokens: Token[] }
  | { type: "blockquote"; tokens: Token[] }
  | { type: "list"; ordered: boolean; items: Token[][] }
  | { type: "html"; content: string }

export type Token = { type: "word"; text: string } | { type: "space"; text: string }

export const letterBlocks: LetterBlock[] = ${JSON.stringify(filteredBlocks, null, 2)}

export const letterPlainText: string = ${JSON.stringify(letterPlainText)}

export const letterExpressive: string = ${JSON.stringify(letterExpressive)}
`

  // Ensure directory exists
  const outputDir = join(process.cwd(), "src/generated")
  try {
    require("fs").mkdirSync(outputDir, { recursive: true })
  } catch {}

  writeFileSync(outputPath, output)
  console.log(`\nExtracted ${blocks.length} blocks`)
  console.log(`Total words: ${letterPlainText.split(/\s+/).filter((w) => w.trim()).length}`)
  console.log(`Output written to: ${outputPath}`)
}

extractLetter().catch(console.error)
