import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Forward the request to PumpFun's IPFS endpoint
    const response = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] PumpFun IPFS upload failed:", errorText)
      return NextResponse.json({ error: "Failed to upload to IPFS" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in pumpfun-ipfs route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
