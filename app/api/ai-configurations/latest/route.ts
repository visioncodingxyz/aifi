import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const configurations = await sql`
      SELECT 
        ac.id,
        ac.name,
        ac.description,
        ac.model,
        ac.created_at,
        ac.wallet_address,
        u.username,
        u.profile_picture_url
      FROM ai_configurations ac
      LEFT JOIN users u ON ac.wallet_address = u.wallet_address
      WHERE ac.is_public = true
      ORDER BY ac.created_at DESC
      LIMIT 8
    `

    return NextResponse.json({ configurations })
  } catch (error) {
    console.error("Error fetching latest AI configurations:", error)
    return NextResponse.json({ error: "Failed to fetch configurations" }, { status: 500 })
  }
}
