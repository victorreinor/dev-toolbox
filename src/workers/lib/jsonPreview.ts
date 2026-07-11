// Shared helper for "→ JSON" workers.
//
// The whole point is that JSON.stringify of a large dataset (which can produce a
// 100MB+ string) runs HERE, inside the worker, never on the main thread. See
// textOutput.ts for how the result crosses back to the UI.

import { buildTextOutput, type TextOutput } from './textOutput'

export type JsonOutput = TextOutput

export function buildJsonOutput(value: unknown): JsonOutput {
  return buildTextOutput(JSON.stringify(value, null, 2), 'application/json')
}
