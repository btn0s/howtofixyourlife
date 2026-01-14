import { config } from "dotenv";
import { join } from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { writeFileSync } from "fs";
import { letterText } from "../src/lib/letter-text";

config({ path: join(process.cwd(), ".env.local") });

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "c6SfcYrb2t09NHXiT80T";
const MAX_CHARS = 4500; // Leave buffer under 5000 limit

function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split("\n\n");
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      // If single paragraph exceeds limit, split by sentences
      if (paragraph.length > maxLength) {
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 > maxLength) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? " " : "") + sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

async function generateChunkAudio(
  elevenlabs: ElevenLabsClient,
  text: string
): Promise<Buffer> {
  const audio = await elevenlabs.textToSpeech.convert(VOICE_ID, {
    text,
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
  });

  const chunks: Uint8Array[] = [];
  const reader = audio.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

async function generateAudio() {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("Error: ELEVENLABS_API_KEY environment variable is required");
    process.exit(1);
  }

  console.log("Initializing ElevenLabs client...");
  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  const chunks = splitTextIntoChunks(letterText, MAX_CHARS);
  console.log(`Split text into ${chunks.length} chunks`);
  console.log(`Total characters: ${letterText.length}\n`);

  try {
    const audioBuffers: Buffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(
        `Generating chunk ${i + 1}/${chunks.length} (${
          chunks[i].length
        } chars)...`
      );
      const buffer = await generateChunkAudio(elevenlabs, chunks[i]);
      audioBuffers.push(buffer);
      console.log(`  Done (${(buffer.length / 1024).toFixed(0)} KB)`);
    }

    console.log("\nCombining audio chunks...");
    const finalBuffer = Buffer.concat(audioBuffers);
    const outputPath = join(process.cwd(), "public", "letter-audio.mp3");

    writeFileSync(outputPath, finalBuffer);
    console.log(`\nAudio saved to: ${outputPath}`);
    console.log(
      `File size: ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB`
    );
  } catch (error) {
    console.error("Failed to generate audio:", error);
    process.exit(1);
  }
}

generateAudio();
