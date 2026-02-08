// Raydium Liquidity Token Creation API Wrapper

export interface RaydiumPrepareResponse {
  request_id: number
  funding_wallet: string
  amount_to_fund: number
}

export interface RaydiumCreateParams {
  request_id: number
  name: string
  ticker: string
  description: string
  imageUrl: string
  developerWallet: string
  website?: string
  twitter?: string
  telegram?: string
  visible?: number // 0=visible, 1=hidden
  decimals?: number // default: 9
  initialSupply?: number // default: 1,000,000,000
  poolTax?: number // Pool fee tier (default: 4 = 4%, min: 0.20)
  reward_ca?: string // Reward token address (default: SOL)
  mode?: number // Distribution mode (0-3, mode 3 mapped to 4)
  dev_fee_percentage?: number // Developer fee (default: 50, auto 30 for mode 3)
  token_address_key?: string // Token keypair (base64 encoded)
  liquidityAmount?: number // Liquidity amount in SOL for the pool
}

export interface RaydiumCreateResponse {
  success: boolean
  mintAddress?: string
  txSignature?: string
  liquidityTxSignature?: string
  data?: {
    metadataUri: string
    liquidityPoolId: string
    revShareRegistered: boolean
    poolTax: number
    taxPercentage: number
  }
  error?: string
  details?: string
}

const RAYDIUM_API_BASE = "https://public-api.revshare.dev"

/**
 * Step 1: Prepare Raydium token creation (same as bonding tokens)
 * Generates a distribution wallet and returns a request_id
 */
export const prepareRaydiumToken = async (): Promise<RaydiumPrepareResponse> => {
  try {
    console.log("[v0] Calling Raydium prepare endpoint...")

    const response = await fetch(`${RAYDIUM_API_BASE}/prepare`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log("[v0] Raydium prepare response status:", response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.log("[v0] Raydium prepare error response:", errorData)
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    console.log("[v0] Raydium prepare API response:", JSON.stringify(data, null, 2))

    if (!data.request_id || !data.funding_wallet || data.amount_to_fund == null) {
      throw new Error("Invalid response from prepare endpoint")
    }

    return data
  } catch (error) {
    console.error("[v0] Error preparing Raydium token:", error)
    throw error
  }
}

/**
 * Step 2: Create Raydium liquidity token
 * Creates token with Raydium liquidity pool instead of bonding curve
 */
export const createRaydiumToken = async (params: RaydiumCreateParams): Promise<RaydiumCreateResponse> => {
  try {
    // Handle mode 3 (No Rewards) special case
    const adjustedParams = { ...params }
    if (params.mode === 3) {
      adjustedParams.dev_fee_percentage = 30 // Auto-set to 30 for mode 3
      adjustedParams.reward_ca = "So11111111111111111111111111111111111111112" // Force SOL
      adjustedParams.mode = 4 // Map mode 3 to 4 for API compatibility
    }

    console.log("[v0] Creating Raydium token with params:", adjustedParams)

    const response = await fetch(`${RAYDIUM_API_BASE}/create-liquidity-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(adjustedParams),
    })

    console.log("[v0] Raydium create-liquidity-token response status:", response.status, response.statusText)

    const data = await response.json()

    console.log("[v0] Raydium create-liquidity-token API response:", JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error("[v0] Raydium API error:", data)
      throw new Error(data.error || data.details || `HTTP ${response.status}: ${response.statusText}`)
    }

    const mintAddress = data.mintAddress || data.data?.mintAddress

    if (!mintAddress) {
      throw new Error(data.error || data.data?.error || "Failed to create Raydium token - no mint address returned")
    }

    console.log("[v0] Raydium token created successfully with mint:", mintAddress)
    return {
      success: true,
      mintAddress,
      txSignature: data.txSignature || data.data?.txSignature,
      liquidityTxSignature: data.liquidityTxSignature || data.data?.liquidityTxSignature,
      data: data.data,
    }
  } catch (error) {
    console.error("[v0] Error creating Raydium token:", error)
    throw error
  }
}
