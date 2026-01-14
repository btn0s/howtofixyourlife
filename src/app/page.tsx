"use client";

import Content from "./content.mdx";
import DynamicIslandLetterPlayer from "@/components/dynamic-island-letter-player";

export default function Page() {
  return (
    <>
      <Content />
      <div className="not-prose">
        <DynamicIslandLetterPlayer />
      </div>
    </>
  );
}
