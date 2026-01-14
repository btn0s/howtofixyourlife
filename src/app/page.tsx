"use client";

import Content from "./content.mdx";
import { AudioPlayer } from "@/components/audio-player";
import { letterText } from "@/lib/letter-text";

export default function Page() {
  return (
    <>
      <Content />
      <AudioPlayer text={letterText} />
    </>
  );
}
