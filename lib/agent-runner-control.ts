export interface AgentRunnerControlState {
  enabled: boolean
  status: "enabled" | "suspended"
  reason: string | null
}

export function getAgentRunnerControlState(): AgentRunnerControlState {
  const enabled = process.env.AGENT_RUNNER_ENABLED === "true"

  return {
    enabled,
    status: enabled ? "enabled" : "suspended",
    reason: enabled
      ? null
      : "AGENT_RUNNER_ENABLED non e true: il runner puo fare polling, ma i job restano in coda.",
  }
}
