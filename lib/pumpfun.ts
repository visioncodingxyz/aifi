export interface PumpPortalMetadataResponse {
  metadata: {
    name: string
    symbol: string
    description: string
  }
  metadataUri: string
}

export interface PumpPortalCreateParams {
  action: "create" | "buy" | "sell" | "collectCreatorFee"
  publicKey: string
  tokenMetadata: {
    name: string
    symbol: string
    uri: string
  }
  mint: string
  denominatedInSol: string
  amount: number
  slippage: number
  priorityFee: number
  pool: string
}

export interface PumpPortalCreateResponse {
  success: boolean
  signature?: string
  mintAddress?: string
  error?: string
}

export async function uploadMetadataToPumpFun(
  imageBlob: Blob,
  name: string,
  symbol: string,
  description: string,
  twitter?: string,
  telegram?: string,
  website?: string,
): Promise<PumpPortalMetadataResponse> {
  const formData = new FormData()
  formData.append("file", imageBlob)
  formData.append("name", name)
  formData.append("symbol", symbol)
  formData.append("description", description)
  if (twitter) formData.append("twitter", twitter)
  if (telegram) formData.append("telegram", telegram)
  if (website) formData.append("website", website)
  formData.append("showName", "true")

  const response = await fetch("/api/pumpfun-ipfs", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload metadata to PumpFun: ${response.statusText}`)
  }

  return await response.json()
}

export async function createPumpFunTokenTransaction(params: PumpPortalCreateParams): Promise<ArrayBuffer> {
  const response = await fetch("https://pumpportal.fun/api/trade-local", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`Failed to create PumpFun token transaction: ${response.statusText}`)
  }

  return await response.arrayBuffer()
}
