import { EventEmitter } from 'events'
import type { Agent, Match, Message, ChooserState } from '../types.js'
import { runContestantTurn } from '../agents/contestant.js'
import { evaluateRound } from '../agents/chooser.js'
import { runJudge } from '../agents/judge.js'
import { writeChooserState, readChooserReaction } from '../storage/og-kv.js'
import { appendMatchLog } from '../storage/og-log.js'
import { updateReputation } from '../chain/reputation.js'

const TOTAL_ROUNDS = 4

export class MatchEngine extends EventEmitter {
  private match: Match
  private currentChooserStateHash: string | null = null

  constructor(match: Match) {
    super()
    this.match = match
  }

  async run(): Promise<Match> {
    this.emit('status', { matchId: this.match.id, status: 'running' })

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      this.match.currentRound = round
      this.emit('round_start', { matchId: this.match.id, round })

      // 1. Each contestant reads chooser state from 0G, generates message
      const roundMessages: Message[] = []

      await Promise.all(this.match.contestants.map(async (agent) => {
        const reaction = this.currentChooserStateHash
          ? await readChooserReaction(this.currentChooserStateHash, agent.id)
          : null

        const content = await runContestantTurn(
          agent, reaction, this.match.messages, round
        )

        const message: Message = {
          agentId: agent.id, agentName: agent.name,
          content, round, timestamp: Date.now()
        }
        roundMessages.push(message)
        this.match.messages.push(message)
        this.emit('message', { matchId: this.match.id, message })
      }))

      // 2. Chooser evaluates all messages
      const prevState = this.currentChooserStateHash
        ? await readChooserReaction(this.currentChooserStateHash, this.match.chooser.id)
        : null

      const newState: ChooserState = await evaluateRound(
        this.match.chooser,
        this.match.contestants,
        roundMessages,
        round,
        null
      )

      // 3. Write new chooser state to 0G KV (this IS the swarm coordination)
      this.currentChooserStateHash = await writeChooserState(this.match.id, newState)
      this.emit('chooser_state', { matchId: this.match.id, state: newState, ogHash: this.currentChooserStateHash })
    }

    // 4. Judge evaluation via 0G Compute
    this.emit('status', { matchId: this.match.id, status: 'judging' })
    this.match.scores = await runJudge(
      this.match.contestants, this.match.chooser, this.match.messages
    )

    // 5. Determine winner
    const winner = this.match.scores.sort((a, b) => b.total - a.total)[0]
    this.match.winnerId = winner.agentId
    this.match.status   = 'complete'

    // 6. Write full match log to 0G Log Store (cold path)
    this.match.ogLogHash = await appendMatchLog(this.match)

    // 7. Update on-chain reputation
    await updateReputation(this.match)

    this.emit('complete', { matchId: this.match.id, match: this.match })
    return this.match
  }
}