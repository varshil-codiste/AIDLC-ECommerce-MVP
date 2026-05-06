import type { LlmToolCall } from '../types/orchestrator.types';

/**
 * Extract a tool call from LLM response content.
 * Handles four formats Claude may produce:
 *   1. Pure JSON:      {"tool_call": {"name": "...", "arguments": {...}}}
 *   2. XML blocks:     <tool_call>{"name": "...", "arguments": {...}}</tool_call>
 *   3. OAI-style text: tool_calls: [{"id":..., "function":{"name":"...","arguments":"..."}}]
 *   4. JSON array:     [{"name": "...", "arguments": {...}}]
 */
export function extractToolCall(content: string): LlmToolCall | null {
  // Format 1: pure JSON with tool_call wrapper
  try {
    const parsed = JSON.parse(content) as { tool_call?: LlmToolCall };
    if (parsed.tool_call?.name) return parsed.tool_call;
  } catch {}

  // Format 2: <tool_call>...</tool_call> XML block
  const xmlMatch = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/i.exec(content);
  if (xmlMatch) {
    try {
      const parsed = JSON.parse(xmlMatch[1]) as LlmToolCall;
      if (parsed.name) return parsed;
    } catch {}
  }

  // Format 3: OpenAI-style  tool_calls: [{..."function":{"name":"...","arguments":"..."}}]
  const oaiMatch = /tool_calls:\s*(\[[\s\S]*?\])/i.exec(content);
  if (oaiMatch) {
    try {
      type OaiCall = { function: { name: string; arguments: string } };
      const arr = JSON.parse(oaiMatch[1]) as OaiCall[];
      const first = arr[0];
      if (first?.function?.name) {
        return {
          name: first.function.name,
          arguments: JSON.parse(first.function.arguments) as Record<string, unknown>,
        };
      }
    } catch {}
  }

  // Format 4: bare JSON array [{"name":"...","arguments":{...}}]
  const arrMatch = /\[\s*\{[\s\S]*?\}\s*\]/.exec(content);
  if (arrMatch) {
    try {
      const arr = JSON.parse(arrMatch[0]) as LlmToolCall[];
      if (arr[0]?.name) return arr[0];
    } catch {}
  }

  return null;
}

/**
 * Remove <tool_call> and <tool_response> XML blocks from text before
 * streaming to the client. Leaves only the human-readable parts.
 */
export function stripToolXml(content: string): string {
  return content
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<tool_response>[\s\S]*?<\/tool_response>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract JSON from a response that may be wrapped in markdown or prose.
 * Tries: direct parse → ```json block → first {...} object.
 */
export function extractJson<T>(content: string): T | null {
  // Direct JSON
  try { return JSON.parse(content) as T; } catch {}

  // ```json ... ``` or ``` ... ``` code block
  const codeMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1].trim()) as T; } catch {}
  }

  // First bare { ... } object in the text
  const objMatch = /\{[\s\S]*\}/.exec(content);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) as T; } catch {}
  }

  return null;
}
