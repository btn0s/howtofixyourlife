"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import Image, { type StaticImageData } from "next/image";

import { cn } from "@/lib/utils";

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  priority,
  src,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image> & {
  priority?: boolean;
  src?: string | StaticImageData;
}) {
  if (priority && src) {
    return (
      <Image
        src={src}
        alt={props.alt || ""}
        fill
        priority
        className={cn("aspect-square size-full not-prose object-cover", className)}
      />
    );
  }

  const imageSrc = typeof src === "string" ? src : src?.src || "";
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full not-prose", className)}
      src={imageSrc}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
