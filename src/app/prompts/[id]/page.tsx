import AppShell from "@/components/layout/AppShell";
import ApiConfigDialog from "@/components/settings/ApiConfigDialog";
import ToolSelector from "@/components/settings/ToolSelector";

interface Props {
  // Next 15+: page params are async.
  params: Promise<{ id: string }>;
}

export default async function PromptPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AppShell initialConversationId={id} />
      <ApiConfigDialog />
      <ToolSelector />
    </>
  );
}
