import { type PublicKey, Transaction } from "@solana/web3.js"
import { RevShareSDK, RevShareError } from "revshare-sdk"

// --- SDK Parameter Interfaces (Strictly from Documentation) ---

export interface FinalizeTokenParams {
  request_id: string
  name: string
  symbol: string // Corresponds to 'ticker' in SDK
  description: string
  imageUrl: string
  developerWallet: string
  website?: string
  twitter?: string
  telegram?: string
  visible?: 0 | 1 // 0=visible, 1=hidden
  decimals?: number
  taxTier?: number // Tax percentage - 6% or 10%
  initialBuy?: number // Initial buy amount in SOL
  reward_ca?: string // SOL reward token (default: SOL)
  mode?: 0 | 1 | 2 | 3 // 0=Rewards, 1=Jackpot, 2=Lottery, 3=No Rewards
  dev_fee_percentage?: number // Developer fee percentage
  bondingCurveType?: 1 | 2 // 1=20 SOL threshold, 2=60 SOL threshold
  ref?: string // Referral wallet address - earns 1% of fees by default
}

// --- Type Definitions for App Components ---
export interface TokenInfo {
  mint: string // Changed from PublicKey
  name: string
  symbol: string
  decimals: number
  supply: number
  creator: string // Changed from PublicKey
  metadata?: {
    name: string
    symbol: string
    description: string
    image: string
  }
  distributionMode: string
  bondingCurveActive: boolean
  // Added for display in TrendingBar and TopTokens (from DB and Dexscreener)
  price?: string // Current price (e.g., from Dexscreener)
  change?: string // 24h price change (e.g., from Dexscreener)
  vol?: string // 24h volume (e.g., from Dexscreener)
  mcap?: string // Market Cap (e.g., from Dexscreener)
  url?: string // Dexscreener URL for the token
  // Fields from FinalizeTokenParams that might be useful for DB storage
  description?: string
  imageUrl?: string
  website?: string
  twitter?: string
  telegram?: string
  developerWallet?: string
  mode?: number
  visible?: number
  taxTier?: number
  initialBuy?: number
  dev_fee_percentage?: number
  bondingCurveType?: number
  createdAt?: string // Added for sorting by age
  // Real-time bonding curve data (from SDK) - these are now expected to be in the DB
  baseReserve?: string // Example: "0d5fc8dd9fc75c5f"
  quoteReserve?: string // Example: "808208da"
  sqrtPrice?: string // Example: "100f585958f439"
  migrationThreshold?: { sol: number; tokens: number }
  poolId?: string
  bondingCurveProgressPercentage?: number // Added for progress bar
  currentQuoteReserveSol?: number // Added for display of current SOL in pool
  lastUpdatedBc?: string // Timestamp of last bonding curve update
  verified?: boolean
}

export interface EnrichedTokenData extends TokenInfo {
  taxBps: number
  initialSupply: number
}

export interface SwapQuote {
  tokenAmount: number
  pricePerToken: number
}

// --- SDK Wrapper Functions ---

/**
 * Initializes and returns an instance of the RevShareSDK.
 */
export const getSdk = (rpcUrl?: string): RevShareSDK => {
  try {
    return new RevShareSDK({ rpcUrl })
  } catch (error) {
    console.error("Error initializing RevShare SDK:", error)
    throw new Error(`Failed to initialize RevShare SDK: ${error}`)
  }
}

/**
 * Step 1: Prepares the token creation process.
 * @param sdk - An instance of RevShareSDK.
 * @returns A promise that resolves with the data needed for funding.
 */
export const prepareTokenCreation = async (
  sdk: RevShareSDK,
): Promise<{ request_id: string; funding_wallet: string; amount_to_fund: number }> => {
  try {
    const result = await sdk.prepare()
    if (!result || !result.request_id || !result.funding_wallet || result.amount_to_fund == null) {
      throw new Error("SDK's prepare() method returned invalid data.")
    }
    return result
  } catch (error) {
    console.error("Error in prepareTokenCreation wrapper:", error)
    if (error instanceof RevShareError) {
      throw new Error(`RevShare Error: ${error.message} (Details: ${JSON.stringify(error.details)})`)
    }
    throw error
  }
}

/**
 * Step 3: Finalizes the token creation after funding is confirmed.
 * @param sdk - An instance of RevShareSDK.
 * @param params - The parameters for creating the token, including the request_id.
 * @returns A promise that resolves with the new token's mint address as a string.
 */
export const finalizeTokenCreation = async (
  sdk: RevShareSDK,
  params: FinalizeTokenParams,
): Promise<{ mint: string }> => {
  try {
    const createParams = {
      request_id: params.request_id,
      name: params.name,
      ticker: params.symbol,
      description: params.description,
      imageUrl: params.imageUrl,
      developerWallet: params.developerWallet,
      website: params.website,
      twitter: params.twitter,
      telegram: params.telegram,
      visible: params.visible,
      decimals: params.decimals,
      taxTier: params.taxTier,
      initialBuy: params.initialBuy ?? 0,
      reward_ca: params.reward_ca,
      mode: params.mode,
      dev_fee_percentage: params.dev_fee_percentage,
      bondingCurveType: params.bondingCurveType,
      ref: params.ref,
    }
    console.log("Sending to SDK create with parameters:", createParams)
    const result = await sdk.create(createParams)

    console.log("SDK create raw result:", result)

    // Check for mint address in multiple possible locations to handle SDK inconsistencies
    const mintAddress = result?.mintAddress || result?.summary?.mintAddress

    if (!mintAddress) {
      console.error("SDK create result missing mint address. Full result:", result)
      throw new Error("SDK did not return a mint address after token creation.")
    }

    return {
      mint: mintAddress,
    }
  } catch (error) {
    console.error("Error in finalizeTokenCreation wrapper:", error)
    if (error instanceof RevShareError) {
      throw new Error(`RevShare Error: ${error.message} (Details: ${JSON.stringify(error.details)})`)
    }
    throw error
  }
}

/**
 * Builds a transaction to claim creator fees for a given token using the RevShareSDK.
 * @param sdk - An instance of RevShareSDK.
 * @param params - Object containing the token mint address.
 * @returns A promise that resolves with a Solana Transaction object.
 */
export const claimCreatorFees = async (
  sdk: RevShareSDK,
  params: { tokenMint: PublicKey },
): Promise<{ transaction: Transaction }> => {
  try {
    const result = await sdk.buildClaimCreatorFeesTransaction({
      tokenAddress: params.tokenMint.toBase58(),
    })

    if (!result || !result.transactionBase64) {
      throw new Error("SDK did not return a transaction for claiming fees.")
    }

    const transaction = Transaction.from(Buffer.from(result.transactionBase64, "base64"))
    return { transaction }
  } catch (error) {
    console.error("Error in claimCreatorFees wrapper:", error)
    if (error instanceof RevShareError) {
      throw new Error(`RevShare Error: ${error.message} (Details: ${JSON.stringify(error.details)})`)
    }
    throw error
  }
}

/**
 * Mocks fetching a swap quote. In a real scenario, this would call the SDK or a dedicated quoting API.
 * @param sdk - An instance of RevShareSDK.
 * @param wallet - The connected wallet.
 * @param params - Object containing token address and SOL amount.
 * @returns A promise that resolves with swap quote data.
 */
export const getSwapQuote = async (
  sdk: RevShareSDK,
  wallet: any, // Use 'any' for wallet for now to avoid strict type issues with WalletContextState
  params: { tokenAddress: string; solAmount: number },
): Promise<SwapQuote> => {
  console.warn("Using mock getSwapQuote. Implement actual SDK call for live data if available.")
  await new Promise((resolve) => setTimeout(resolve, 300)) // Simulate network delay

  // This mock logic can be replaced if the SDK provides a direct quoting method
  // or if you implement a calculation based on the bonding curve formula.
  const mockPricePerToken = 0.000001 // Example mock price
  const estimatedTokens = params.solAmount / mockPricePerToken

  return {
    tokenAmount: estimatedTokens,
    pricePerToken: mockPricePerToken,
  }
}

/**
 * Executes a bonding curve swap (buy or sell) with automatic signing and sending using the RevShareSDK.
 * @param sdk - An instance of RevShareSDK.
 * @param wallet - The connected wallet.
 * @param params - Object containing token address, action, and amount.
 * @returns A promise that resolves with swap result and transaction signature.
 */
export const executeSwap = async (
  sdk: RevShareSDK,
  wallet: any, // Use 'any' for wallet for now
  params: { tokenAddress: string; action: "buy" | "sell"; amount: number },
): Promise<{ signature: string }> => {
  console.log(`Executing swap: ${params.action} ${params.amount} on ${params.tokenAddress}`)
  try {
    const result = await sdk.executeBondingCurveSwap({
      tokenAddress: params.tokenAddress,
      action: params.action,
      amount: params.amount,
      keypair: wallet.wallet?.adapter, // Pass the wallet adapter as keypair for signing
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_HOST, // Use the RPC host from env
    })

    if (!result || !result.transactionSignature) {
      throw new Error("SDK did not return a transaction signature after swap.")
    }

    return { signature: result.transactionSignature }
  } catch (error) {
    console.error("Error in executeSwap wrapper:", error)
    if (error instanceof RevShareError) {
      throw new Error(`RevShare Error: ${error.message} (Details: ${JSON.stringify(error.details)})`)
    }
    throw error
  }
}
