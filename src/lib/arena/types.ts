export type Phase =
  | 'loading'
  | 'open'
  | 'full'
  | 'starting'
  | 'running'
  | 'judging'
  /** Orchestrator finished; aligns with on-chain `SETTLED`. */
  | 'complete'
  | 'cancelled'
  | 'failed'
