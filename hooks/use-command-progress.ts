import { useOrchestrationStore } from '@/lib/stores/orchestration-store'

export function useCommandProgress() {
  const stage = useOrchestrationStore((state) => state.stage)
  const progress = useOrchestrationStore((state) => state.progress)
  const reasoning = useOrchestrationStore((state) => state.streamingReasoning)
  const entities = useOrchestrationStore((state) => state.extractedEntities)
  const actionStream = useOrchestrationStore((state) => state.actionStream)
  const isProcessing = useOrchestrationStore((state) => state.isProcessing)
  const tokenCost = useOrchestrationStore((state) => state.tokenCost)

  return {
    stage,
    progress,
    reasoning,
    entities,
    actionStream,
    isProcessing,
    tokenCost,
  }
}
