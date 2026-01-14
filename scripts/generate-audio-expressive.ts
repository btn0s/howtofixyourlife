import { config } from "dotenv";
import { join } from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { writeFileSync } from "fs";
import { letterExpressive } from "../src/generated/letter";

interface CharacterAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

config({ path: join(process.cwd(), ".env.local") });

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "c6SfcYrb2t09NHXiT80T";
const MAX_CHARS = 4500; // eleven_v3 limit is 5000

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
): Promise<{
  audio: Buffer;
  alignment: CharacterAlignment | null;
  duration: number;
}> {
  const response = await elevenlabs.textToSpeech.convertWithTimestamps(
    VOICE_ID,
    {
      text,
      modelId: "eleven_v3",
      outputFormat: "mp3_44100_128",
    }
  );

  const audioBase64 = (response as any).audioBase64;
  if (!audioBase64) {
    throw new Error("Audio base64 data not found in response");
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");
  const rawAlignment = (response as any).alignment;
  const alignment: CharacterAlignment | null = rawAlignment 
    ? (rawAlignment as CharacterAlignment)
    : null;

  let duration = 0;
  if (alignment?.characterEndTimesSeconds?.length) {
    const endTimes = alignment.characterEndTimesSeconds;
    duration = endTimes[endTimes.length - 1] || 0;
  }

  return {
    audio: audioBuffer,
    alignment,
    duration,
  };
}

async function generateAudio() {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error(
      "Error: ELEVENLABS_API_KEY environment variable is required"
    );
    process.exit(1);
  }

  console.log("Initializing ElevenLabs client...");
  console.log("Using eleven_v3 with expressive speech tags\n");
  
  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  const chunks = splitTextIntoChunks(letterExpressive, MAX_CHARS);
  console.log(`Split text into ${chunks.length} chunks`);
  console.log(`Total characters: ${letterExpressive.length}\n`);

      const tags = letterExpressive.match(/\[[^\]]+\]/g) || [];
      console.log(`Expressive tags found: ${tags.length}`);
      console.log(`Tags: ${[...new Set(tags)].join(", ")}\n`);

  try {
    const audioBuffers: Buffer[] = [];
    const mergedAlignment: CharacterAlignment = {
      characters: [],
      characterStartTimesSeconds: [],
      characterEndTimesSeconds: [],
    };
    let cumulativeOffset = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkTags = chunks[i].match(/\[[^\]]+\]/g) || [];
      console.log(
        `Generating chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars, ${chunkTags.length} tags)...`
      );
      const { audio, alignment, duration } = await generateChunkAudio(
        elevenlabs,
        chunks[i]
      );
      audioBuffers.push(audio);
      console.log(
        `  Done (${(audio.length / 1024).toFixed(0)} KB, ${duration.toFixed(2)}s)`
      );

      if (alignment) {
        mergedAlignment.characters.push(...alignment.characters);
        mergedAlignment.characterStartTimesSeconds.push(
          ...alignment.characterStartTimesSeconds.map(
            (t) => t + cumulativeOffset
          )
        );
        mergedAlignment.characterEndTimesSeconds.push(
          ...alignment.characterEndTimesSeconds.map(
            (t) => t + cumulativeOffset
          )
        );
      }

      cumulativeOffset += duration;
    }

    console.log("\nCombining audio chunks...");
    const finalBuffer = Buffer.concat(audioBuffers);
    const audioOutputPath = join(process.cwd(), "public", "letter-audio.mp3");
    const alignmentOutputPath = join(
      process.cwd(),
      "public",
      "letter-alignment.json"
    );

    writeFileSync(audioOutputPath, finalBuffer);
    writeFileSync(
      alignmentOutputPath,
      JSON.stringify(mergedAlignment, null, 2)
    );

    console.log(`\nAudio saved to: ${audioOutputPath}`);
    console.log(`File size: ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`\nAlignment saved to: ${alignmentOutputPath}`);
    console.log(
      `Total characters: ${mergedAlignment.characters.length}`
    );
    console.log(
      `Total duration: ${cumulativeOffset.toFixed(2)}s`
    );
  } catch (error) {
    console.error("Failed to generate audio:", error);
    process.exit(1);
  }
}

generateAudio();
