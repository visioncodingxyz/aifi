import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    console.log("[v0] Starting distributions data fetch")

    const tokenAddress = "AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn"
    const cacheBuster = Date.now()

    // Try to get distributions data from the revshare API
    const distributionsEndpoint = `https://revshare.dev/api/token/${tokenAddress}/distributions?t=${cacheBuster}`

    console.log(`[v0] Fetching distributions from: ${distributionsEndpoint}`)
    const apiResponse = await fetch(distributionsEndpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; DataExtractor/1.0)",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })

    if (apiResponse.ok) {
      const apiData = await apiResponse.json()
      console.log(`[v0] Distributions API response:`, JSON.stringify(apiData).substring(0, 500))

      if (Array.isArray(apiData) && apiData.length > 0) {
        const distributions = apiData.map((item, index) => {
          let dateTime =
            item.date_added ||
            item.timestamp ||
            item.date ||
            new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString()

          // Convert "2025-09-27 21:42:02" format to proper format without time adjustment
          const date = new Date(dateTime.replace(" ", "T"))
          date.setHours(date.getHours() - 1) // Subtract 1 hour
          dateTime = date.toISOString().slice(0, 19).replace("T", " ")

          return {
            id: item.id || `dist_${index}`,
            dateTime,
            amountDistributed: Number.parseFloat(item.distributed || item.amount || "0"),
            status: item.status || "Complete",
          }
        })

        distributions.sort((a, b) => {
          const dateA = new Date(a.dateTime.replace(" ", "T") + "Z")
          const dateB = new Date(b.dateTime.replace(" ", "T") + "Z")
          return dateB.getTime() - dateA.getTime()
        })

        const response = NextResponse.json({ success: true, data: distributions })
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
        return response
      }
    }

    console.log("[v0] No distributions data available from API")
    const response = NextResponse.json(
      {
        success: false,
        error: "No distributions data available",
        message: "Awaiting first distribution event",
      },
      { status: 404 },
    )
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
    return response
  } catch (error) {
    console.error("[v0] Failed to fetch distributions data:", error)

    const response = NextResponse.json(
      {
        success: false,
        error: "Failed to fetch distributions data",
        message: "Awaiting first distribution event",
      },
      { status: 500 },
    )
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
    return response
  }
}
