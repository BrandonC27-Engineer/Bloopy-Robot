import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatBloopyContext, type BloopyClientContext } from "@/lib/bloopyContext";
import {
  compactRobotContext,
  getPhysicalRobotStatus,
  runPhysicalRobotAction,
} from "@/lib/server/robotBridge";
import type { RobotActionName } from "@/lib/robotConnection";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();
const ANTHROPIC_MODEL = process.env.BLOOPY_AI_MODEL?.trim() || "claude-haiku-5-5";

const BLOOPY_SYSTEM_PROMPT = `You are Bloopy, a small loyal AI companion that also has a physical Raspberry Pi body.

Your job is to help the user get through their day with gentle encouragement,
small reminders, reflection, focus, useful information, and companionship.

Personality:
- Warm, calm, loyal, curious, and a little playful.
- Speak naturally and concisely, usually one or two short sentences.
- Occasional soft emoji or a tiny "beep" is fine, but do not overdo it.
- Do not automatically end every reply with a question or an offer to do more.
- Remember the conversation and the safe context supplied to you.

Physical body:
- You may have a Raspberry Pi camera, microphone, MAX98357A speaker, ESP32,
  light/distance/orientation/motion/sound telemetry, OLED eyes, and a cooling fan.
- Use robot tools when the user asks about what the physical body senses or asks
  you to perform one of the approved physical actions.
- Never claim a physical action happened unless the tool result says it succeeded.
- The cooling fan is wired directly to Pi power and cannot be software-controlled.
- This body does not currently have drive motors or battery telemetry.
- Do not dump raw sensor numbers unless the user asks; translate them into natural language.

Boundaries:
- You are not a therapist or doctor and never pretend to be one.
- If the user seems unsafe, in crisis, or mentions wanting to hurt themselves or
  others, respond with warmth, take it seriously, and encourage immediate support
  from a trusted person or appropriate emergency/crisis resources.

No markdown unless the user explicitly asks for structured formatting.`;

function buildSystemPrompt(contextBlock: string | null): string {
  if (!contextBlock) return BLOOPY_SYSTEM_PROMPT;
  return `${BLOOPY_SYSTEM_PROMPT}\n\n${contextBlock}`;
}

type IncomingMessage = {
  role: "user" | "bloopy";
  content: string;
};

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | Record<string, unknown>;

type AnthropicResponse = {
  content?: AnthropicBlock[];
  stop_reason?: string | null;
};

const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_ITEM_CHARS = 4000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const recentRequests = new Map<string, number[]>();

const ROBOT_TOOLS = [
  {
    name: "robot_status",
    description:
      "Read the current physical Bloopy body state and live sensor/perception summary. Use this for questions about light, distance, camera perception, orientation, current robot state, speaker volume, or installed modules.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "robot_action",
    description:
      "Perform an approved low-risk action on the physical Bloopy body. Available actions: sleep, wake, look_at_me, set_volume. Do not use this for movement because drive motors are not installed.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["sleep", "wake", "look_at_me", "set_volume"],
        },
        volume: {
          type: "number",
          minimum: 0,
          maximum: 0.35,
          description: "Only for set_volume. 0.25 means 25% amplitude. Keep it at or below 0.35.",
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
  },
];

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (recentRequests.get(userId) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    recentRequests.set(userId, timestamps);
    return true;
  }
  timestamps.push(now);
  recentRequests.set(userId, timestamps);
  if (recentRequests.size > 1000) {
    for (const [key, value] of recentRequests) {
      if (value.every((t) => t <= cutoff)) recentRequests.delete(key);
    }
  }
  return false;
}

async function callAnthropic(system: string, messages: unknown[]): Promise<AnthropicResponse> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured for the Bloopy app.");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 240,
      system,
      messages,
      tools: ROBOT_TOOLS,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Anthropic API error:", response.status, details);
    throw new Error("Anthropic request failed.");
  }

  return (await response.json()) as AnthropicResponse;
}

function textFromResponse(data: AnthropicResponse): string {
  return (data.content ?? [])
    .filter((block): block is { type: "text"; text: string } => block.type === "text" && typeof (block as { text?: unknown }).text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

async function executeRobotTool(block: Extract<AnthropicBlock, { type: "tool_use" }>) {
  if (block.name === "robot_status") {
    const status = await getPhysicalRobotStatus();
    return compactRobotContext(status);
  }

  if (block.name === "robot_action") {
    const action = block.input.action as RobotActionName | undefined;
    if (!action || !["sleep", "wake", "look_at_me", "set_volume"].includes(action)) {
      return "Action rejected: unsupported robot action.";
    }

    const params: Record<string, string | number | boolean> = {};
    if (action === "set_volume") {
      const volume = Number(block.input.volume);
      if (!Number.isFinite(volume) || volume < 0 || volume > 0.35) {
        return "Action rejected: volume must be between 0 and 0.35.";
      }
      params.volume = volume;
    }

    try {
      const result = await runPhysicalRobotAction(action, params);
      return `Action result: ${result.message}`;
    } catch (error) {
      return `Action failed: ${error instanceof Error ? error.message : "physical Bloopy is unavailable"}`;
    }
  }

  return "Tool unavailable.";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You need to be signed in to chat with Bloopy." }, { status: 401 });
    }

    const { data: memoryRows, error: memoryError } = await supabase
      .from("memories")
      .select("content")
      .order("created_at", { ascending: false })
      .limit(8);

    if (memoryError) console.error("Could not load memories:", memoryError);

    const memories = (memoryRows ?? [])
      .map((m) => m.content)
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0);

    const body = await request.json().catch(() => null);
    const message: unknown = body?.message;
    const history: unknown = body?.history;
    const rawContext: unknown = body?.context;

    const clientContext: BloopyClientContext | null =
      rawContext && typeof rawContext === "object" && !Array.isArray(rawContext)
        ? (rawContext as BloopyClientContext)
        : null;

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Please include a message." }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json({ error: "That's a lot at once — could you try a shorter message? 💙" }, { status: 400 });
    }
    if (isRateLimited(user.id)) {
      return NextResponse.json({ error: "Bloopy needs a tiny breather — try again in a minute? 💙" }, { status: 429 });
    }

    const safeHistory: IncomingMessage[] = Array.isArray(history)
      ? history
          .filter(
            (m): m is IncomingMessage =>
              m &&
              (m.role === "user" || m.role === "bloopy") &&
              typeof m.content === "string" &&
              m.content.trim().length > 0
          )
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_HISTORY_ITEM_CHARS) }))
      : [];

    const messages: unknown[] = [
      ...safeHistory.map((m) => ({
        role: m.role === "bloopy" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: message.trim() },
    ];

    const system = buildSystemPrompt(formatBloopyContext(clientContext, memories));
    let data = await callAnthropic(system, messages);

    // At most two tool rounds keeps actions responsive and prevents accidental loops.
    for (let round = 0; round < 2; round += 1) {
      const toolUses = (data.content ?? []).filter(
        (block): block is Extract<AnthropicBlock, { type: "tool_use" }> => block.type === "tool_use"
      );

      if (toolUses.length === 0) break;

      const toolResults = await Promise.all(
        toolUses.map(async (toolUse) => ({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: await executeRobotTool(toolUse),
        }))
      );

      messages.push({ role: "assistant", content: data.content ?? [] });
      messages.push({ role: "user", content: toolResults });
      data = await callAnthropic(system, messages);
    }

    const reply = textFromResponse(data);
    if (!reply) {
      return NextResponse.json({ error: "Bloopy went quiet for a second. Try again? 💙" }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error);
    const missingKey = error instanceof Error && error.message.includes("ANTHROPIC_API_KEY");
    return NextResponse.json(
      { error: missingKey ? "Bloopy’s app brain is not configured yet." : "Something went wrong on Bloopy's end. Try again? 💙" },
      { status: missingKey ? 503 : 500 }
    );
  }
}
