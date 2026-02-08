import { consumeStream, streamText } from "ai"
import { google } from "@ai-sdk/google"
import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"

export const maxDuration = 30

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

function getModel(modelString: string) {
  // Parse model string to determine provider and model
  const lowerModel = modelString.toLowerCase()

  if (lowerModel.includes("gemini") || lowerModel.includes("google")) {
    // Extract model name (e.g., "gemini-2.5-flash" from "google/gemini-2.5-flash" or "gemini-2.5-flash")
    const modelName = modelString.split("/").pop() || "gemini-2.0-flash-exp"
    return google(modelName, {
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    })
  } else if (lowerModel.includes("claude") || lowerModel.includes("anthropic")) {
    const modelName = modelString.split("/").pop() || "claude-sonnet-4-5-20250929"
    return anthropic(modelName, {
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  } else if (lowerModel.includes("gpt") || lowerModel.includes("openai")) {
    const modelName = modelString.split("/").pop() || "gpt-4o-mini"
    return openai(modelName, {
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  // Default to OpenAI GPT-4o-mini
  return openai("gpt-4o-mini", {
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      model,
      systemPrompt,
    }: {
      messages: ChatMessage[]
      model: string
      systemPrompt?: string
    } = await req.json()

    console.log("[v0] Chat API called with model:", model)
    console.log("[v0] System prompt:", systemPrompt)

    if (!messages || !Array.isArray(messages)) {
      console.error("[v0] Invalid messages format:", messages)
      return new Response(JSON.stringify({ error: "Messages must be an array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const aiModel = getModel(model || "gpt-4o-mini")

    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages,
      abortSignal: req.signal,
    })

    return result.toUIMessageStreamResponse({
      onFinish: async ({ isAborted }) => {
        if (isAborted) {
          console.log("[v0] Chat stream aborted")
        } else {
          console.log("[v0] Chat stream completed")
        }
      },
      consumeSseStream: consumeStream,
    })
  } catch (error) {
    console.error("[v0] Error in chat API:", error)
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
