import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const aiAgents = await sql`
      SELECT 
        ac.id,
        ac.wallet_address,
        u.username,
        ac.name,
        ac.description,
        ac.model,
        ac.tools_web_search,
        ac.tools_code_execution,
        ac.tools_image_generation,
        ac.tools_data_analysis,
        ac.knowledge_base_files,
        ac.created_at
      FROM ai_configurations ac
      LEFT JOIN users u ON ac.wallet_address = u.wallet_address
      WHERE ac.is_public = true
      ORDER BY ac.created_at DESC
    `

    return NextResponse.json({ success: true, agents: aiAgents })
  } catch (error) {
    console.error("Error fetching public AI agents:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch AI agents" }, { status: 500 })
  }
}
