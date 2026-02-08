import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet")

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    // Check if user exists
    const users = await sql`
      SELECT * FROM users 
      WHERE wallet_address = ${walletAddress}
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({ user: users[0] }, { status: 200 })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet_address, username } = body

    if (!wallet_address || !username) {
      return NextResponse.json({ error: "Wallet address and username are required" }, { status: 400 })
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 },
      )
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT * FROM users 
      WHERE wallet_address = ${wallet_address}
      LIMIT 1
    `

    if (existingUsers.length > 0) {
      return NextResponse.json({ user: existingUsers[0] }, { status: 200 })
    }

    // Check if username is already taken
    const usernameCheck = await sql`
      SELECT * FROM users 
      WHERE username = ${username}
      LIMIT 1
    `

    if (usernameCheck.length > 0) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }

    // Create new user
    const newUsers = await sql`
      INSERT INTO users (wallet_address, username)
      VALUES (${wallet_address}, ${username})
      RETURNING *
    `

    return NextResponse.json({ user: newUsers[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
