import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: Promise<{ walletAddress: string }> }) {
  try {
    const { walletAddress } = await params

    console.log("[v0] Fetching AI configurations for wallet:", walletAddress)

    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Wallet address is required" }, { status: 400 })
    }

    const configurations = await sql`
      SELECT 
        id,
        name,
        description,
        model,
        wallet_address,
        tools_web_search,
        tools_code_execution,
        tools_image_generation,
        tools_data_analysis,
        created_at,
        is_public
      FROM ai_configurations
      WHERE wallet_address = ${walletAddress}
      ORDER BY created_at DESC
    `

    console.log("[v0] Found configurations:", configurations.length)
    console.log("[v0] Configurations data:", JSON.stringify(configurations, null, 2))

    return NextResponse.json({
      success: true,
      configurations: configurations || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching user AI configurations:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch AI configurations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
