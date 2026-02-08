import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { agentName, agentDescription } = await request.json()

    if (!agentName || !agentDescription) {
      return NextResponse.json({ success: false, error: "Agent name and description are required" }, { status: 400 })
    }

    const tickerCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a ticker symbol generator. Create a ticker symbol (3-5 characters) that DIRECTLY represents the agent name. Extract key letters or abbreviate the name logically. Examples: 'Bitcoin Expert' → 'BTC', 'Crypto Advisor' → 'CRYPT', 'Trading Bot' → 'TRADE'. Return ONLY the ticker symbol in uppercase, nothing else.",
        },
        {
          role: "user",
          content: `Create a ticker symbol that directly matches this agent name: "${agentName}"`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, direct results
      max_tokens: 10,
    })

    const ticker = tickerCompletion.choices[0].message.content?.trim().toUpperCase() || "TOKEN"

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Design a premium cryptocurrency token logo specifically for an AI agent called "${agentName}".

Agent Purpose: ${agentDescription}

Design Requirements:
- Create a circular token logo that visually represents the agent's specific purpose and characteristics
- Use symbols, icons, or abstract shapes that directly relate to what this agent does
- Modern, professional cryptocurrency aesthetic
- Vibrant gradient colors: electric cyan (#06b6d4), vivid purple (#a855f7), hot pink (#ec4899)
- Clean, minimalist design with strong visual impact
- No text or letters in the design
- High contrast and bold shapes
- Premium quality suitable for a top-tier crypto token

The logo should immediately communicate what "${agentName}" does based on: ${agentDescription}. Make it unique and memorable while maintaining professional crypto token standards.`,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "vivid",
    })

    const imageUrl = imageResponse.data[0].url

    return NextResponse.json({
      success: true,
      ticker,
      imageUrl,
    })
  } catch (error: any) {
    console.error("Error generating token details from agent:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate token details" },
      { status: 500 },
    )
  }
}
