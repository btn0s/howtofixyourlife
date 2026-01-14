"use client";

import Content from "./content.mdx";

export default function Page() {
  return (
    <article className="min-h-screen bg-[#fffdfa] text-zinc-900 selection:bg-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:selection:bg-zinc-800">
      <div className="mx-auto max-w-2xl px-8 py-16 sm:py-20">
        <div className="prose prose-xl prose-zinc max-w-none dark:prose-invert prose-headings:font-serif prose-p:font-serif prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-li:text-zinc-700 dark:prose-li:text-zinc-300">
          <Content />
        </div>
      </div>
    </article>
  );
}
