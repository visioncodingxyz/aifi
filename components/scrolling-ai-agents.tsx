"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Sparkles } from "lucide-react"

interface AIAgent {
  id: number
  name: string
  description: string
  model: string
  username: string
  created_at: string
}

interface ScrollingAIAgentsProps {
  onAgentClick?: (agent: AIAgent) => void
}

export function ScrollingAIAgents({ onAgentClick }: ScrollingAIAgentsProps) {
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [loading, setLoading] = useState(true)

  const getModelGradient = (model: string) => {
    if (model?.includes("claude")) {
      return "from-orange-500 to-red-500"
    } else if (model?.includes("gpt")) {
      return "from-green-500 to-emerald-500"
    } else if (model?.includes("gemini")) {
      return "from-blue-500 to-cyan-500"
    }
    return "from-purple-500 to-pink-500" // default
  }

  const getModelDisplayName = (model: string) => {
    if (model?.includes("claude")) return "Claude"
    if (model?.includes("gpt")) return "GPT-4"
    if (model?.includes("gemini")) return "Gemini"
    return "AI Model"
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/public-ai-agents")
      const data = await response.json()
      if (data.success && data.agents) {
        setAgents(data.agents)
      }
    } catch (error) {
      console.error("Error fetching AI agents:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()

    const interval = setInterval(() => {
      fetchAgents()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleAgentClick = (agent: AIAgent) => {
    if (onAgentClick) {
      onAgentClick(agent)
    }
  }

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 border-b border-slate-700/50">
          <CardTitle className="text-slate-100 text-base flex items-center">
            <Sparkles className="mr-2 h-4 w-4 text-cyan-500" />
            Newest AI Agents
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center text-slate-400 text-sm py-8">Loading agents...</div>
        </CardContent>
      </Card>
    )
  }

  const duplicatedAgents = [...agents, ...agents]

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm contain-paint">
      <CardHeader className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 border-b border-slate-700/50">
        <CardTitle className="text-slate-100 text-base flex items-center">
          <Sparkles className="mr-2 h-4 w-4 text-cyan-500" />
          Newest AI Agents
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {agents.length > 0 ? (
          <div className="relative h-[200px] overflow-hidden scroll-optimized">
            <div className="animate-marquee-vertical">
              {duplicatedAgents.map((agent, index) => (
                <div
                  key={`${agent.id}-${index}`}
                  onClick={() => handleAgentClick(agent)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer group mb-2 relative"
                >
                  <div
                    className={`w-6 h-6 rounded-md bg-gradient-to-br ${getModelGradient(agent.model)} flex items-center justify-center flex-shrink-0`}
                  >
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-cyan-400 transition-colors truncate flex-1">
                    {agent.name}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700/50">
                    {getModelDisplayName(agent.model)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 text-sm py-8">No agents available</div>
        )}
      </CardContent>
    </Card>
  )
}
