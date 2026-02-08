import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    console.log("[v0] Starting revshare data fetch")

    const tokenAddress = "AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn"

    const cacheBuster = Date.now()
    const apiEndpoints = [
      `https://revshare.dev/api/token/${tokenAddress}?t=${cacheBuster}`,
      `https://revshare.dev/api/token-data/${tokenAddress}?t=${cacheBuster}`,
      `https://revshare.dev/api/token/${tokenAddress}/distributions?t=${cacheBuster}`,
    ]

    let minimumRequired = 0
    let totalSolDistributed = 0
    let totalDistributions = 0
    let foundRealData = false

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`[v0] Trying API endpoint: ${endpoint}`)
        const apiResponse = await fetch(endpoint, {
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
          console.log(`[v0] API response from ${endpoint}:`, JSON.stringify(apiData).substring(0, 500))

          if (apiData && typeof apiData === "object" && apiData.min_holding) {
            minimumRequired = apiData.min_holding
            foundRealData = true
            console.log(`[v0] Found minimum required: ${minimumRequired}`)
          }

          if (Array.isArray(apiData) && apiData.length > 0) {
            console.log(`[v0] Found array data with ${apiData.length} items`)
            totalDistributions = apiData.length

            // Sum up all the distributed amounts
            totalSolDistributed = apiData.reduce((sum, distribution) => {
              const distributed = Number.parseFloat(distribution.distributed || 0)
              return sum + distributed
            }, 0)

            foundRealData = true
            console.log(`[v0] Calculated from array: ${totalDistributions} distributions, ${totalSolDistributed} SOL`)
          }

          if (apiData && typeof apiData === "object" && !Array.isArray(apiData)) {
            if (apiData.totalSolDistributed || apiData.total_sol || apiData.solDistributed) {
              totalSolDistributed = Number.parseFloat(
                apiData.totalSolDistributed || apiData.total_sol || apiData.solDistributed,
              )
              foundRealData = true
            }
            if (apiData.totalDistributions || apiData.total_distributions || apiData.distributionCount) {
              totalDistributions = Number.parseInt(
                apiData.totalDistributions || apiData.total_distributions || apiData.distributionCount,
              )
              foundRealData = true
            }
          }
        } else {
          console.log(`[v0] API endpoint ${endpoint} returned status: ${apiResponse.status}`)
        }
      } catch (apiError) {
        console.log(`[v0] API endpoint ${endpoint} failed:`, apiError.message)
      }
    }

    if (foundRealData && totalSolDistributed > 0 && totalDistributions > 0) {
      const revshareData = {
        totalSolDistributed: Math.round(totalSolDistributed * 10000) / 10000,
        totalDistributions,
        minimumRequired,
        lastUpdated: new Date().toISOString(),
        dataSource: "RevShare API",
      }

      console.log("[v0] Successfully extracted real data:", revshareData)

      const response = NextResponse.json({ success: true, data: revshareData })
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
      response.headers.set("Pragma", "no-cache")
      response.headers.set("Expires", "0")
      response.headers.set("Surrogate-Control", "no-store")
      response.headers.set("CDN-Cache-Control", "no-store")
      response.headers.set("Vercel-CDN-Cache-Control", "no-store")

      return response
    }

    console.log("[v0] No real data found, returning error")
    const responseError = NextResponse.json({
      success: false,
      error: "No distribution data available yet",
    })
    responseError.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
    responseError.headers.set("Pragma", "no-cache")
    responseError.headers.set("Expires", "0")

    return responseError
  } catch (error) {
    console.error("[v0] Failed to fetch revshare data:", error)

    const responseError = NextResponse.json({
      success: false,
      error: "Failed to fetch distribution data",
    })
    responseError.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
    responseError.headers.set("Pragma", "no-cache")
    responseError.headers.set("Expires", "0")

    return responseError
  }
}
