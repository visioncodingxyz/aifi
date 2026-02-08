import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      mint_address,
      name,
      symbol,
      description,
      image_url,
      creator_wallet,
      developer_wallet,
      initial_buy_amount,
      initial_supply,
      decimals,
      website,
      twitter,
      telegram,
      referral_wallet,
      dev_fee_percentage,
      bonding_curve_type,
      tax_tier,
      mode,
      reward_ca,
      request_id,
      visible,
      platform,
      pool_tax,
    } = body

    const validPlatforms = ["meteora", "pumpfun", "raydium"]
    const tokenPlatform = platform && validPlatforms.includes(platform) ? platform : "meteora"

    const result = await sql`
      INSERT INTO tokens (
        mint_address,
        name,
        symbol,
        description,
        image_url,
        creator_wallet,
        developer_wallet,
        initial_buy_amount,
        initial_supply,
        decimals,
        website,
        twitter,
        telegram,
        referral_wallet,
        dev_fee_percentage,
        bonding_curve_type,
        tax_tier,
        mode,
        reward_ca,
        request_id,
        visible,
        platform,
        launch_status,
        created_at,
        updated_at
      ) VALUES (
        ${mint_address},
        ${name},
        ${symbol},
        ${description},
        ${image_url},
        ${creator_wallet},
        ${developer_wallet},
        ${initial_buy_amount},
        ${initial_supply || 1000000000},
        ${decimals},
        ${website || null},
        ${twitter || null},
        ${telegram || null},
        ${referral_wallet || null},
        ${dev_fee_percentage},
        ${bonding_curve_type},
        ${tax_tier || pool_tax},
        ${mode},
        ${reward_ca},
        ${request_id || null},
        ${visible},
        ${tokenPlatform},
        'completed',
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, token: result[0] })
  } catch (error: any) {
    console.error("Error saving token:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get("wallet")

    let tokens
    if (wallet) {
      tokens = await sql`
        SELECT * FROM tokens 
        WHERE creator_wallet = ${wallet} OR developer_wallet = ${wallet}
        ORDER BY created_at DESC
      `
    } else {
      tokens = await sql`
        SELECT * FROM tokens 
        ORDER BY created_at DESC
        LIMIT 100
      `
    }

    return NextResponse.json({ success: true, tokens })
  } catch (error: any) {
    console.error("Error fetching tokens:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
