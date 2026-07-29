"use client";

import { useChatStore } from "@/store/chatStore";
import { Key, BarChart3, Database, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import ApiConfigsPage from "./ApiConfigsPage";
import UsagePage from "./UsagePage";
import DbStatusPage from "./DbStatusPage";
import DbContentPage from "./DbContentPage";

const dashboardTabs = [
  { id: "api-configs" as const, label: "API Configs", icon: Key },
  { id: "usage" as const, label: "Usage", icon: BarChart3 },
  { id: "db-status" as const, label: "DB Status", icon: Database },
  { id: "db-content" as const, label: "DB Content", icon: FolderOpen },
];

export default function DashboardPage() {
  const { dashboardView, setDashboardView } = useChatStore();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab Bar */}
      <div className="border-b border-border px-6 bg-background flex-shrink-0">
        <div className="flex gap-1 overflow-x-auto">
          {dashboardTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDashboardView(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap",
                dashboardView === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {dashboardView === "api-configs" && <ApiConfigsPage />}
        {dashboardView === "usage" && <UsagePage />}
        {dashboardView === "db-status" && <DbStatusPage />}
        {dashboardView === "db-content" && <DbContentPage />}
      </div>
    </div>
  );
}
