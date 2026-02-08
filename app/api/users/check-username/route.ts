import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")
    const walletAddress = searchParams.get("wallet")

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ available: false, error: "Invalid username format" }, { status: 200 })
    }

    let existingUsers
    if (walletAddress) {
      existingUsers = await sql`
        SELECT username FROM users 
        WHERE username = ${username}
        AND wallet_address != ${walletAddress}
        LIMIT 1
      `
    } else {
      existingUsers = await sql`
        SELECT username FROM users 
        WHERE username = ${username}
        LIMIT 1
      `
    }

    return NextResponse.json({ available: existingUsers.length === 0 }, { status: 200 })
  } catch (error) {
    console.error("Error checking username:", error)
    return NextResponse.json({ error: "Failed to check username" }, { status: 500 })
  }
}
