import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!/^\d+$/.test(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format. ID must be numeric." }, { status: 400 })
    }

    const result = await sql`
      SELECT 
        ac.id,
        ac.wallet_address,
        u.username,
        ac.name,
        ac.description,
        ac.prompt,
        ac.model,
        ac.tools_web_search,
        ac.tools_code_execution,
        ac.tools_image_generation,
        ac.tools_data_analysis,
        ac.knowledge_base_files,
        ac.is_public,
        ac.created_at
      FROM ai_configurations ac
      LEFT JOIN users u ON ac.wallet_address = u.wallet_address
      WHERE ac.id = ${id}
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "AI configuration not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, agent: result[0] })
  } catch (error) {
    console.error("Error fetching AI configuration:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch AI configuration" }, { status: 500 })
  }
}
