import { redirect } from "next/navigation";

type TaskDeepLinkPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskDeepLinkPage({
  params,
}: TaskDeepLinkPageProps) {
  const { id } = await params;
  const taskId = String(id || "").trim();

  if (!taskId) {
    redirect("/workspace");
  }

  redirect(`/workspace?taskId=${encodeURIComponent(taskId)}&action=view`);
}
