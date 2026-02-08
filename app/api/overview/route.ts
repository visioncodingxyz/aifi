import { NextResponse } from "next/server"
import { Connection, PublicKey } from "@solana/web3.js"

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

async function getTokenSupplyFromRPC(tokenAddress: string): Promise<number> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.mainnet-beta.solana.com"
    const connection = new Connection(rpcUrl, "confirmed")
    const mintPublicKey = new PublicKey(tokenAddress)
    const supply = await connection.getTokenSupply(mintPublicKey)
    const circulatingSupply = Number(supply.value.amount) / Math.pow(10, supply.value.decimals)
    console.log("[v0] Token supply from RPC:", circulatingSupply)
    return circulatingSupply
  } catch (error) {
    console.error("[v0] Error fetching token supply from RPC:", error)
    return 0
  }
}

export async function GET() {
  try {
    console.log("[v0] Starting overview data fetch")

    const tokenAddress = "AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn"

    let circulatingSupply = 0
    try {
      circulatingSupply = await getTokenSupplyFromRPC(tokenAddress)
    } catch (rpcError) {
      console.error("[v0] Error fetching from RPC:", rpcError)
      circulatingSupply = 972589747 // Use known supply as fallback
    }

    const totalSupply = 1000000000 // 1 billion
    const tokensBurned = totalSupply - circulatingSupply

    const distributionsUrl = `https://revshare.dev/api/token/${tokenAddress}/distributions?t=${Date.now()}`
    console.log("[v0] Fetching distributions from:", distributionsUrl)

    let rewardsDistributed = 0
    let totalDistributions = 0

    try {
      const distributionsResponse = await fetchWithTimeout(
        distributionsUrl,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        },
        10000,
      )

      if (distributionsResponse.ok) {
        const distributionsData = await distributionsResponse.json()
        console.log("[v0] Distributions data received, processing...")

        if (Array.isArray(distributionsData)) {
          totalDistributions = distributionsData.length
          rewardsDistributed = distributionsData.reduce((sum: number, dist: any) => {
            return sum + (Number.parseFloat(dist.distributed) || 0)
          }, 0)
          // Values are already in SOL format, no need to divide by 1e9
          console.log("[v0] Calculated rewards:", rewardsDistributed, "SOL from", totalDistributions, "distributions")
        }
      } else {
        console.log("[v0] Distributions API error:", distributionsResponse.status)
      }
    } catch (error) {
      console.error("[v0] Error fetching distributions:", error)
    }

    const result = {
      tokensBurned,
      circulatingSupply,
      rewardsDistributed,
      totalDistributions,
      lastUpdated: new Date().toISOString(),
    }

    console.log("[v0] Overview data compiled successfully:", result)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[v0] Error in overview API:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch overview data" }, { status: 500 })
  }
}
