import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

export async function GET() {
  console.log("[v0] ===== PUBLIC AI AGENTS ENDPOINT CALLED =====")

  try {
    const sql = neon(process.env.DATABASE_URL!)
    console.log("[v0] Database connection established")

    console.log("[v0] Executing query for public AI agents...")

    const agents = await sql`
      SELECT 
        ac.id,
        ac.name,
        ac.description,
        ac.model,
        ac.wallet_address,
        ac.tools_web_search,
        ac.tools_code_execution,
        ac.tools_image_generation,
        ac.tools_data_analysis,
        ac.created_at,
        ac.is_public,
        u.username
      FROM ai_configurations ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.is_public = true
      ORDER BY ac.created_at DESC
    `

    console.log("[v0] Query completed. Found", agents.length, "public AI agents")
    console.log("[v0] Response data:", JSON.stringify({ success: true, agents }, null, 2))

    return Response.json({
      success: true,
      agents,
    })
  } catch (error) {
    console.error("[v0] Error fetching public AI agents:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch AI agents",
      },
      { status: 500 },
    )
  }
}
