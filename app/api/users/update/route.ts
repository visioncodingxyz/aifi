import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const walletAddress = formData.get("wallet_address") as string
    const username = formData.get("username") as string
    const profilePictureUrl = formData.get("profile_picture_url") as string | null

    if (!walletAddress || !username) {
      return NextResponse.json({ error: "Wallet address and username are required" }, { status: 400 })
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 },
      )
    }

    // Check if username is already taken by another user
    const usernameCheck = await sql`
      SELECT * FROM users 
      WHERE username = ${username} AND wallet_address != ${walletAddress}
      LIMIT 1
    `

    if (usernameCheck.length > 0) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }

    const updatedUsers = await sql`
      UPDATE users 
      SET username = ${username}, 
          profile_picture_url = ${profilePictureUrl},
          updated_at = CURRENT_TIMESTAMP
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `

    if (updatedUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: updatedUsers[0] }, { status: 200 })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
