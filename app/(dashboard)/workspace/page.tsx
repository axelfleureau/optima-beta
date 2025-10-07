import { DynamicWorkspace } from "@/components/dynamic-workspace"
import { AutoGenPreview } from "@/components/calendar/auto-gen-preview"

export default function WorkspacePage() {
  return (
    <div className="h-screen">
      <DynamicWorkspace />
      <AutoGenPreview />
    </div>
  )
}
