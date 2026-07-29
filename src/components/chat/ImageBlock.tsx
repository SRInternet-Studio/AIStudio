"use client";

interface ImageBlockProps {
  content: string;
}

export default function ImageBlock({ content }: ImageBlockProps) {
  return (
    <div className="p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={content}
        alt="Uploaded content"
        className="max-w-full rounded-lg"
        style={{ maxHeight: "400px" }}
      />
    </div>
  );
}
