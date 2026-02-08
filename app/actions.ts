"use server"

import { neon } from "@neondatabase/serverless"
import type { TokenInfo } from "@/lib/revshare"
import { GoogleGenerativeAI } from "@google/generative-ai"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Saves a newly created token to the database
 */
export async function saveTokenToDb(token: TokenInfo) {
  try {
    await sql`
      INSERT INTO tokens (
        mint_address,
        name,
        symbol,
        description,
        image_url,
        website,
        twitter,
        telegram,
        developer_wallet,
        creator_wallet,
        mode,
        visible,
        decimals,
        tax_tier,
        initial_buy_amount,
        dev_fee_percentage,
        bonding_curve_type,
        bonding_curve_active,
        distribution_mode,
        current_price,
        price_change_24h,
        volume_24h,
        market_cap,
        initial_supply,
        launch_status,
        created_at
      ) VALUES (
        ${token.mint},
        ${token.name},
        ${token.symbol},
        ${token.description || ""},
        ${token.imageUrl || ""},
        ${token.website || ""},
        ${token.twitter || ""},
        ${token.telegram || ""},
        ${token.developerWallet || ""},
        ${token.creator},
        ${token.mode || 0},
        ${token.visible || 0},
        ${token.decimals || 9},
        ${token.taxTier || 6},
        ${token.initialBuy || 0},
        ${token.dev_fee_percentage || 50},
        ${token.bondingCurveType || 1},
        ${token.bondingCurveActive || true},
        ${token.distributionMode || ""},
        ${Number.parseFloat(token.price || "0")},
        ${Number.parseFloat(token.change?.replace(/[^0-9.-]/g, "") || "0")},
        ${Number.parseFloat(token.vol?.replace(/[^0-9.-]/g, "") || "0")},
        ${Number.parseFloat(token.mcap?.replace(/[^0-9.-]/g, "") || "0")},
        ${token.supply || 0},
        ${"launched"},
        NOW()
      )
    `
    return { success: true }
  } catch (error: any) {
    console.error("Error saving token to database:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Generates token details using AI (Gemini)
 */
export async function generateTokenDetailsWithAi(topic: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const prompt = `You are a creative token designer. Generate a fun and engaging meme token based on this topic: "${topic}".

Return ONLY a valid JSON object with these exact fields (no markdown, no code blocks, just raw JSON):
{
  "name": "Full token name (2-4 words, creative and catchy)",
  "ticker": "Token symbol (3-5 uppercase letters)",
  "description": "Engaging description (2-3 sentences, fun and memeable)",
  "imageUrl": "https://placeholder.svg?height=400&width=400&query=<describe the token mascot/logo in detail for image generation>"
}

Make it fun, creative, and suitable for a meme token. The imageUrl query should describe a mascot or logo that represents the token theme.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Clean up the response - remove markdown code blocks if present
    const cleanedText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    const parsed = JSON.parse(cleanedText)

    return {
      name: parsed.name,
      ticker: parsed.ticker,
      description: parsed.description,
      imageUrl: parsed.imageUrl,
    }
  } catch (error: any) {
    console.error("Error generating token details with AI:", error)
    return {
      error: error.message || "Failed to generate token details",
      name: "",
      ticker: "",
      description: "",
      imageUrl: "",
    }
  }
}
