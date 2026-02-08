import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extract form fields
    const walletAddress = formData.get("walletAddress") as string
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const prompt = formData.get("prompt") as string
    const model = formData.get("model") as string
    const toolsWebSearch = formData.get("toolsWebSearch") === "true"
    const toolsCodeExecution = formData.get("toolsCodeExecution") === "true"
    const toolsImageGeneration = formData.get("toolsImageGeneration") === "true"
    const toolsDataAnalysis = formData.get("toolsDataAnalysis") === "true"
    const isPublic = formData.get("isPublic") === "true"

    // Validate required fields
    if (!walletAddress || !name || !prompt || !model) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const existingConfig = await sql`
      SELECT id FROM ai_configurations WHERE name = ${name}
    `

    if (existingConfig.length > 0) {
      return NextResponse.json(
        { error: "An AI agent with this name already exists. Please choose a different name." },
        { status: 409 },
      )
    }

    // Get user_id from wallet_address
    const userResult = await sql`
      SELECT id FROM users WHERE wallet_address = ${walletAddress}
    `

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userId = userResult[0].id

    // Handle knowledge base file uploads
    const knowledgeBaseFiles: Array<{ name: string; url: string; size: number }> = []
    const files = formData.getAll("knowledgeBase") as File[]

    for (const file of files) {
      if (file && file.size > 0) {
        try {
          // Upload to Vercel Blob
          const blob = await put(`ai-configs/${walletAddress}/${Date.now()}-${file.name}`, file, {
            access: "public",
          })

          knowledgeBaseFiles.push({
            name: file.name,
            url: blob.url,
            size: file.size,
          })
        } catch (uploadError) {
          console.error("Error uploading file:", uploadError)
          // Continue with other files even if one fails
        }
      }
    }

    // Insert AI configuration into database
    const result = await sql`
      INSERT INTO ai_configurations (
        user_id,
        wallet_address,
        name,
        description,
        prompt,
        model,
        tools_web_search,
        tools_code_execution,
        tools_image_generation,
        tools_data_analysis,
        knowledge_base_files,
        is_public
      ) VALUES (
        ${userId},
        ${walletAddress},
        ${name},
        ${description || ""},
        ${prompt},
        ${model},
        ${toolsWebSearch},
        ${toolsCodeExecution},
        ${toolsImageGeneration},
        ${toolsDataAnalysis},
        ${JSON.stringify(knowledgeBaseFiles)},
        ${isPublic}
      )
      RETURNING *
    `

    revalidatePath("/api/public-ai-agents")

    return NextResponse.json({
      success: true,
      configuration: result[0],
      filesUploaded: knowledgeBaseFiles.length,
    })
  } catch (error) {
    console.error("Error saving AI configuration:", error)
    return NextResponse.json({ error: "Failed to save AI configuration" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("walletAddress")

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    const configurations = await sql`
      SELECT * FROM ai_configurations 
      WHERE wallet_address = ${walletAddress}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ configurations })
  } catch (error) {
    console.error("Error fetching AI configurations:", error)
    return NextResponse.json({ error: "Failed to fetch AI configurations" }, { status: 500 })
  }
}
