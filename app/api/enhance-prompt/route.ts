import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert AI prompt engineer. Your task is to take a user's basic system prompt for an AI agent and enhance it to be more effective, detailed, and well-structured. 

Guidelines for enhancement:
- Maintain the core intent and personality of the original prompt
- Add specific behavioral guidelines and response patterns
- Include examples of how the AI should handle different scenarios
- Define clear boundaries and capabilities
- Make it more actionable and specific
- Keep it concise but comprehensive (aim for 200-400 words)
- Use clear, professional language
- Structure it logically with clear sections if needed

Return ONLY the enhanced prompt text, no explanations or meta-commentary.`,
        },
        {
          role: "user",
          content: `Enhance this AI agent system prompt:\n\n${prompt}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const enhancedPrompt = completion.choices[0].message.content

    return NextResponse.json({ enhancedPrompt })
  } catch (error) {
    console.error("Error enhancing prompt:", error)
    return NextResponse.json({ error: "Failed to enhance prompt" }, { status: 500 })
  }
}
