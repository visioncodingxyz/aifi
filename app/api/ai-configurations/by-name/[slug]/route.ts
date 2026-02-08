import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { slug } = params

    // Fetch AI configuration by name (case-insensitive, matching slug format)
    const result = await sql`
      SELECT 
        id,
        name,
        description,
        model,
        prompt,
        knowledge_base_files,
        tools_web_search,
        tools_code_execution,
        tools_image_generation,
        tools_data_analysis,
        is_public,
        wallet_address,
        created_at
      FROM ai_configurations
      WHERE LOWER(REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '-', '')) = LOWER(REPLACE(${slug}, '-', ''))
      AND is_public = true
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "AI configuration not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching AI configuration:", error)
    return NextResponse.json({ error: "Failed to fetch AI configuration" }, { status: 500 })
  }
}
