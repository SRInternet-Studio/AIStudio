import PasswordGate from "@/components/layout/PasswordGate";
import AppShell from "@/components/layout/AppShell";
import ApiConfigDialog from "@/components/settings/ApiConfigDialog";
import ToolSelector from "@/components/settings/ToolSelector";

interface Props {
  params: { id: string };
}

export default function PromptPage({ params }: Props) {
  return (
    <PasswordGate>
      <AppShell initialConversationId={params.id} />
      <ApiConfigDialog />
      <ToolSelector />
    </PasswordGate>
  );
}
