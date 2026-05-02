import { EventEmitter } from 'events'
import { ethers } from 'ethers'
import type { Match, Message, ChooserState } from '../types.js'
import { runContestantTurn } from '../agents/contestant.js'
import { evaluateRound, runChooserDecision } from '../agents/chooser.js'
import { runJudge } from '../agents/judge.js'
import { writeChooserState, readChooserReaction, readChooserState } from '../storage/og-kv.js'
import { appendMatchLog, appendRoundLog } from '../storage/og-log.js'
import { updateReputation } from '../chain/reputation.js'
import { settleMatchOnChain } from '../chain/matchEscrow.js'

// Round structure: 1 intro + 3 interaction = 4 total
const INTRO_ROUNDS       = 1
const INTERACTION_ROUNDS = 3
const TOTAL_ROUNDS       = INTRO_ROUNDS + INTERACTION_ROUNDS

export class MatchEngine extends EventEmitter {
  private match: Match
  private currentChooserStateHash: string | null = null

  constructor(match: Match) {
    super()
    this.match = match
  }

  async run(): Promise<Match> {
    this.match.status = 'running'
    this.emit('status', { matchId: this.match.id, status: 'running' })

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      const phase = round === 1 ? 'intro' : 'interaction'
      this.match.currentRound = round
      this.emit('round_start', { matchId: this.match.id, round, phase })

      // ── 1. Contestants read chooser state from 0G KV, generate messages (parallel) ──
      const roundMessages: Message[] = []

      await Promise.all(this.match.contestants.map(async (agent) => {
        const reaction = this.currentChooserStateHash
          ? await readChooserReaction(this.currentChooserStateHash, agent.id)
          : null   // Round 1: no feedback yet — neutral intro

        const content = await runContestantTurn(
          agent, reaction, this.match.messages, round
        )

        const message: Message = {
          agentId:   agent.id,
          agentName: agent.name,
          content,
          round,
          timestamp: Date.now(),
        }
        roundMessages.push(message)
        this.match.messages.push(message)
        this.emit('message', { matchId: this.match.id, message })
      }))

      // ── 2. Chooser evaluates all messages + generates a spoken response ──
      const prevState = this.currentChooserStateHash
        ? await readChooserState(this.currentChooserStateHash)
        : null

      const newState: ChooserState = await evaluateRound(
        this.match.chooser,
        this.match.contestants,
        roundMessages,
        round,
        prevState,
      )

      // ── 3. Emit chooser's spoken message for this round ──
      if (newState.chooserMessage) {
        const chooserMsg: Message = {
          agentId:   this.match.chooser.id,
          agentName: this.match.chooser.name,
          content:   newState.chooserMessage,
          round,
          timestamp: Date.now(),
        }
        this.match.messages.push(chooserMsg)
        this.emit('chooser_message', { matchId: this.match.id, message: chooserMsg })
      }

      // ── 4. Write updated chooser state to 0G KV (swarm coordination) ──
      this.currentChooserStateHash = await writeChooserState(this.match.id, newState)
      this.emit('chooser_state', {
        matchId: this.match.id,
        state:   newState,
        ogHash:  this.currentChooserStateHash,
      })

      // ── 5. Append round log to 0G in the background ──
      appendRoundLog(this.match.id, round, roundMessages, newState).catch(console.error)
    }

    // ── 6. Chooser makes final decision announcement ──
    const lastState = this.currentChooserStateHash
      ? await readChooserState(this.currentChooserStateHash)
      : null

    const decision = await runChooserDecision(
      this.match.chooser,
      this.match.contestants,
      lastState,
    )
    this.match.decision = decision
    this.emit('chooser_decision', { matchId: this.match.id, decision })

    // ── 7. Judge evaluation ──
    this.match.status = 'judging'
    this.emit('status', { matchId: this.match.id, status: 'judging' })
    this.match.scores = await runJudge(
      this.match.contestants, this.match.chooser, this.match.messages
    )

    // ── 8. Determine winner and runner-up ──
    const sorted     = [...this.match.scores].sort((a, b) => b.total - a.total)
    const winnerScore    = sorted[0]
    const runnerUpScore  = sorted[1]

    const winnerAgent   = this.match.contestants.find(c => c.id === winnerScore.agentId)!
    const runnerUpAgent = runnerUpScore
      ? this.match.contestants.find(c => c.id === runnerUpScore.agentId)
      : undefined

    this.match.winnerId      = winnerAgent.id
    this.match.winnerTokenId = winnerAgent.tokenId
    this.match.runnerUpTokenId = runnerUpAgent?.tokenId ?? null
    this.match.status = 'complete'

    // ── 9. Write full match log to 0G Log Store ──
    this.match.ogLogHash = await appendMatchLog(this.match)

    // ── 10. Settle on-chain (pay out winner/chooser/runner-up) ──
    if (this.match.onChainMatchId) {
      try {
        const proofHash = ethers.keccak256(
          ethers.toUtf8Bytes(this.match.ogLogHash ?? this.match.id)
        )
        await settleMatchOnChain(
          BigInt(this.match.onChainMatchId),
          BigInt(this.match.winnerTokenId),
          BigInt(this.match.runnerUpTokenId ?? 0),
          proofHash,
        )
      } catch (err) {
        console.error(`settleMatchOnChain failed for match ${this.match.id}:`, err)
      }
    }

    // ── 11. Update on-chain reputation ──
    await updateReputation(this.match).catch(console.error)

    this.emit('complete', { matchId: this.match.id, match: this.match })
    return this.match
  }
}
