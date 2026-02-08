import { type NextRequest, NextResponse } from "next/server"

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000) {
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address parameter is required" }, { status: 400 })
    }

    const solscanUrl = `https://api.solscan.io/v2/token/meta?address=${address}`

    const response = await fetchWithTimeout(
      solscanUrl,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://solscan.io/",
          Origin: "https://solscan.io",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        cache: "no-store",
      },
      5000,
    )

    if (!response.ok) {
      console.error("[v0] Solscan proxy error:", response.status, response.statusText)
      return NextResponse.json({ error: "Failed to fetch from Solscan" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in Solscan proxy:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
