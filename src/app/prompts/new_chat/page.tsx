import AppShell from "@/components/layout/AppShell";
import ApiConfigDialog from "@/components/settings/ApiConfigDialog";
import ToolSelector from "@/components/settings/ToolSelector";

export default function NewChatPage() {
  return (
    <>
      <AppShell initialView="playground" />
      <ApiConfigDialog />
      <ToolSelector />
    </>
  );
}
