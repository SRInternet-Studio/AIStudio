import PasswordGate from "@/components/layout/PasswordGate";
import AppShell from "@/components/layout/AppShell";
import ApiConfigDialog from "@/components/settings/ApiConfigDialog";
import ToolSelector from "@/components/settings/ToolSelector";

export default function LibraryPage() {
  return (
    <PasswordGate>
      <AppShell initialView="history" />
      <ApiConfigDialog />
      <ToolSelector />
    </PasswordGate>
  );
}
