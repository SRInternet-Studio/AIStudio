"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import ChatArea from "@/components/chat/ChatArea";
import InputBox from "@/components/chat/InputBox";
import ApiConfigDialog from "@/components/settings/ApiConfigDialog";
import ToolSelector from "@/components/settings/ToolSelector";
import DashboardPage from "@/components/dashboard/DashboardPage";
import { useChatStore } from "@/store/chatStore";
import { Plus, ArrowLeft } from "lucide-react";
import type { Message, Block } from "@/types";

export default function Home() {
  const {
    settings,
    setSettings,
    currentConversation,
    setCurrentConversation,
    messages,
    setMessages,
    activeView,
    setActiveView,
    conversations,
    setConversations,
    setSystemTemplates,
  } = useChatStore();

  const [messagesWithBlocks, setMessagesWithBlocks] = useState<
    (Message & { blocks: Block[] })[]
  >([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) setSettings(data.data);
      })
      .catch(console.error);
  }, [setSettings]);

  useEffect(() => {
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) setConversations(data.data);
      })
      .catch(console.error);
  }, [setConversations]);

  useEffect(() => {
    fetch("/api/system-templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) setSystemTemplates(data.data);
      })
      .catch(console.error);
  }, [setSystemTemplates]);

  useEffect(() => {
    if (!currentConversation) {
      setMessages([]);
      setMessagesWithBlocks([]);
      return;
    }
    fetch(`/api/conversations/${currentConversation.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const msgs = data.data.messages || [];
          setMessages(msgs);
          setMessagesWithBlocks(msgs);
        }
      })
      .catch(console.error);
  }, [currentConversation?.id]);

  useEffect(() => {
    setMessagesWithBlocks(messages as (Message & { blocks: Block[] })[]);
  }, [messages]);

  const handleSelectConversation = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      setCurrentConversation(conv);
      setActiveView("playground");
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setMessagesWithBlocks([]);
  };

  const renderHeader = () => {
    if (activeView === "dashboard") {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("playground")}
            className="p-1.5 rounded-md hover:bg-surface-variant transition-colors duration-150 text-muted hover:text-foreground"
            title="Back to Playground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground">Dashboard</span>
        </div>
      );
    }
    if (currentConversation) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {currentConversation.title}
          </span>
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-md hover:bg-surface-variant transition-colors duration-150 text-muted hover:text-foreground"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      );
    }
    return undefined;
  };

  const renderContent = () => {
    if (activeView === "playground") {
      return (
        <div className="flex flex-col flex-1 min-h-0">
          <ChatArea messages={messagesWithBlocks} />
          <InputBox />
        </div>
      );
    }
    if (activeView === "history") {
      return (
        <div className="flex-1 overflow-y-auto p-8">
          <h2 className="text-lg font-medium text-foreground mb-4">History</h2>
          {conversations.length === 0 ? (
            <p className="text-muted text-sm">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className="w-full text-left p-3 rounded-lg border transition-all duration-150 bg-card border-border hover:bg-surface-variant"
                >
                  <p className="text-sm text-foreground truncate">{conv.title}</p>
                  <p className="text-xs text-muted mt-1">
                    {new Date(conv.created_at).toLocaleDateString("zh-CN")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (activeView === "dashboard") {
      return <DashboardPage />;
    }
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted text-sm">Documentation - Coming soon</p>
      </div>
    );
  };

  return (
    <>
      <MainLayout headerContent={renderHeader()}>
        {renderContent()}
      </MainLayout>
      <ApiConfigDialog />
      <ToolSelector />
    </>
  );
}
