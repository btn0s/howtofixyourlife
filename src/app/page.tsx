"use client";

import Content from "./content.mdx";

export default function Page() {
  return (
    <article className="min-h-screen bg-[#fffdfa] text-zinc-900 selection:bg-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:selection:bg-zinc-800">
      <div className="prose prose-neutral prose-sm px-8 py-16 sm:py-20 mx-auto [&>h1]:text-pretty">
        <Content />
      </div>
    </article>
  );
}
