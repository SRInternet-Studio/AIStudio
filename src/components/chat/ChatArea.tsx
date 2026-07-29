"use client";

import { useChatStore } from "@/store/chatStore";
import type { Block, Message } from "@/types";
import ContentBlock from "./ContentBlock";
import TextBlock from "./TextBlock";
import ImageBlock from "./ImageBlock";
import ThinkingBlock from "./ThinkingBlock";
import BlockActions from "./BlockActions";

interface ChatAreaProps {
  messages: (Message & { blocks: Block[] })[];
}

export default function ChatArea({ messages }: ChatAreaProps) {
  const { currentConversation } = useChatStore();

  if (!currentConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8">
        <h1 className="text-4xl font-normal text-foreground mb-8">
          Explore AI models
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            { icon: "⭐", title: "Featured", desc: "Test out our most advanced and newest models." },
            { icon: "💬", title: "Code and Chat", desc: "Build chatbots, agents, and code with AI models." },
            { icon: "🖼️", title: "Image Generation", desc: "Create and edit images with AI." },
            { icon: "", title: "Video Generation", desc: "Generate videos with state of the art video generation models." },
            { icon: "🎵", title: "Speech and Music", desc: "Explore text to speech and music generation models." },
            { icon: "⚡", title: "Real-time", desc: "Real-time voice and video with Live API." },
          ].map((item) => (
            <div
              key={item.title}
              className="panel p-5 panel-hover cursor-pointer space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium text-foreground">{item.title}</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <button className="btn-primary mt-8">Start building</button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 min-h-0">
      {/* Conversation title */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-medium text-foreground">
          {currentConversation.title}
        </h2>
      </div>

      {/* Messages */}
      {messages.map((msg) => (
        <div key={msg.id} className="space-y-3 animate-in fade-in duration-300">
          {/* Message header */}
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-medium">
              {msg.role === "user" ? "User" : "Model"}
            </span>
            <span>•</span>
            <span>
              {new Date(msg.created_at).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Blocks rendered as ContentBlock cards */}
          {msg.blocks
            .filter((b) => !b.is_deleted)
            .sort((a, b) => a.position - b.position)
            .map((block) => (
              <div key={block.id} className="relative group">
                <BlockActions blockId={block.id} messageId={msg.id} />
                <ContentBlock type={block.type}>
                  {block.type === "text" && <TextBlock content={block.content} />}
                  {block.type === "image" && <ImageBlock content={block.content} />}
                  {block.type === "thinking" && <ThinkingBlock content={block.content} />}
                  {block.type === "tool_result" && (
                    <TextBlock
                      content={block.content}
                      className="bg-surface-variant border-l-2 border-l-accent"
                    />
                  )}
                </ContentBlock>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
