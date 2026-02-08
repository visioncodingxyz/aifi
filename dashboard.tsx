"use client"

import { CardFooter } from "@/components/ui/card"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Activity, AlertCircle, BarChart3, Brain, Check, Command, DollarSign, Eye, FileText, Globe, Type as type, LucideIcon, LineChart, Pencil, Plus, RefreshCw, Rocket, Search, Settings, Shield, Sparkles, Upload, User, Wallet, Zap, Camera, MessageSquare, Send, Copy, Info, CheckCircle2, Home, Flame, Coins, Gift, ChevronDown, X, Bot, Share2, ChevronLeft, ChevronRight, ArrowRight, ExternalLink } from "lucide-react"

import { ScrollingAIAgents } from "@/components/scrolling-ai-agents"
import { ViewToggle } from "@/components/view-toggle"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

import { cn } from "@/lib/utils" // Import cn utility

// Wallet adapter types
interface WalletAdapter {
  name: string
  icon: string
  url: string
  readyState: "Installed" | "NotDetected" | "Loadable" | "Unsupported"
}

interface UserProfile {
  id: number
  wallet_address: string
  username: string
  profile_picture_url?: string
  created_at: string
  updated_at: string
}

const DEFAULT_PROFILE_PICTURE = "/default-avatar.png"

const truncateAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

export default function Dashboard() {
  const [explorePage, setExplorePage] = useState(0)
  const AGENTS_PER_PAGE = 9

  const [exploreView, setExploreView] = useState<"agents" | "tokens">("agents")
  const [exploreTokens, setExploreTokens] = useState<any[]>([])
  const [exploreTokensLoading, setExploreTokensLoading] = useState(false)

  const [latestAgents, setLatestAgents] = useState<any[]>([])
  const [loadingLatestAgents, setLoadingLatestAgents] = useState(true)

  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handleAgentClick = (agent: any) => {
    const slug = createSlug(agent.name)
    const agentUrl = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      model: agent.model,
      username: agent.username,
      wallet_address: agent.wallet_address,
      website: `https://aifi.app/#chat-${agent.id}`,
      twitter: agent.twitter,
      telegram: agent.telegram,
    }
    window.location.hash = `chat-${agent.id}`
    setActiveView("chat")
    fetchAIConfiguration(slug)
    setChatMessages([])
  }

  const [activeView, setActiveView] = useState<
    "home" | "my-dashboard" | "ai-studio" | "explore" | "docs" | "chat" | "launch" | "create"
  >(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1) // Remove the # symbol
      if (hash === "create") return "create" // Changed from "ai-studio" to "create"
      if (hash === "explore") return "explore"
      if (hash === "docs") return "docs"
      if (hash === "launch") return "launch"
      if (hash === "dashboard") return "my-dashboard"
      if (hash && hash !== "home") return "chat"
    }
    return "home"
  })

  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [connectedWallet, setConnectedWallet] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [availableWallets, setAvailableWallets] = useState<WalletAdapter[]>([])
  const [isConnecting, setIsConnecting] = useState(false)

  const [usernameError, setUsernameError] = useState<string>("")
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)

  // Profile setup form state
  const [profileForm, setProfileForm] = useState({
    username: "",
    profilePicture: null as File | null,
    profilePicturePreview: "",
  })

  const [systemStatus, setSystemStatus] = useState(85)
  const [cpuUsage, setCpuUsage] = useState(42)
  const [memoryUsage, setMemoryUsage] = useState(68)
  const [networkStatus, setNetworkStatus] = useState(92)
  const [securityLevel, setSecurityLevel] = useState(100)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [copied, setCopied] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false) // Can be removed but keeping for now in case needed later

  const [isRefreshing, setIsRefreshing] = useState(false)

  const [aiForm, setAiForm] = useState({
    name: "",
    description: "",
    prompt: "",
    model: "gemini-2.5-flash", // Set default to Gemini 2.5 Flash
    temperature: [0.7],
    maxTokens: [2048],
    tools: {
      webSearch: false,
      codeExecution: false,
      imageGeneration: false,
      dataAnalysis: false,
    },
    knowledgeBase: [] as File[], // Changed from single File to array of Files
    isPublic: true, // Set public AI as default
  })

  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false)

  const handleEnhancePrompt = async () => {
    if (!aiForm.prompt || aiForm.prompt.trim().length === 0) return

    setIsEnhancingPrompt(true)
    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiForm.prompt }),
      })

      if (!response.ok) throw new Error("Failed to enhance prompt")

      const data = await response.json()
      setAiForm({ ...aiForm, prompt: data.enhancedPrompt })
    } catch (error) {
      console.error("Error enhancing prompt:", error)
      alert("Failed to enhance prompt. Please try again.")
    } finally {
      setIsEnhancingPrompt(false)
    }
  }

  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [exploreAgents, setExploreAgents] = useState<any[]>([])
  const [exploreLoading, setExploreLoading] = useState(false)

  // Chat state
  const [currentChatAgent, setCurrentChatAgent] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [allConfigurations, setAllConfigurations] = useState<any[]>([])

  const [userAIConfigurations, setUserAIConfigurations] = useState<any[]>([])
  const [userAIsLoading, setUserAIsLoading] = useState(false)

  const [selectedPlatform, setSelectedPlatform] = useState<"meteora" | "pumpfun" | "raydium" | null>(null)

  const [tokenForm, setTokenForm] = useState({
    name: "",
    symbol: "",
    description: "",
    imageUrl: "",
    twitter: "",
    telegram: "",
    website: "",
    initialBuyAmount: "0.1",
    poolTax: "4",
    mode: "0",
    devFeePercentage: "50",
    liquidityAmount: "0.1",
  })

  const [isLaunchingToken, setIsLaunchingToken] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [launchSuccess, setLaunchSuccess] = useState(false)

  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [aiAgents, setAiAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)
  const [isGeneratingFromAgent, setIsGeneratingFromAgent] = useState(false)

  const fetchAiAgents = async () => {
    setIsLoadingAgents(true)
    try {
      const response = await fetch("/api/ai-configurations/list")
      const data = await response.json()
      console.log("[v0] Fetched AI agents from API:", data.agents?.length || 0, "agents")
      if (data.success) {
        setAiAgents(data.agents)
        console.log("[v0] Set aiAgents state with:", data.agents.length, "agents")
      }
    } catch (error) {
      console.error("Error fetching AI agents:", error)
    } finally {
      setIsLoadingAgents(false)
    }
  }

  const handleAgentSelect = async (agent: any) => {
    setSelectedAgent(agent)
    setShowAgentDropdown(false)
    setIsGeneratingFromAgent(true)

    try {
      // Generate ticker and image from agent details
      const response = await fetch("/api/generate-from-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentName: agent.name,
          agentDescription: agent.description,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Prefill the form with agent details
        setTokenForm({
          ...tokenForm,
          name: agent.name,
          symbol: data.ticker,
          description: agent.description,
          imageUrl: data.imageUrl,
          website: `https://aifisolana.com/#chat-${agent.id}`,
        })
      }
    } catch (error) {
      console.error("Error generating from agent:", error)
    } finally {
      setIsGeneratingFromAgent(false)
    }
  }

  const handleNewAgent = () => {
    setShowAgentDropdown(false)
    setActiveView("create") // Changed from "ai-studio" to "create"
  }

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const validFiles = Array.from(files).filter((file) => {
      const validTypes = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]
      const maxSize = 10 * 1024 * 1024 // 10MB
      return validTypes.includes(file.type) && file.size <= maxSize
    })

    setAiForm((prev) => ({
      ...prev,
      knowledgeBase: [...prev.knowledgeBase, ...validFiles],
    }))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect],
  )

  const removeFile = useCallback((index: number) => {
    setAiForm((prev) => ({
      ...prev,
      knowledgeBase: prev.knowledgeBase.filter((_, i) => i !== index),
    }))
  }, [])

  const [tokenData, setTokenData] = useState({
    price: 0,
    priceChange24h: 0,
    marketCap: 0,
    volume24h: 0,
    loading: true,
    error: null,
  })

  const [rewardsData, setRewardsData] = useState({
    totalSolDistributed: 0,
    totalDistributions: 0,
    minimumRequired: 0,
    loading: true,
    error: null,
    hasData: false, // Track if we have real data
  })

  const [overviewData, setOverviewData] = useState({
    tokensBurned: 0,
    circulatingSupply: 0,
    rewardsDistributed: 0,
    loading: true,
    error: null as string | null,
  })

  const [distributionsData, setDistributionsData] = useState({
    distributions: [],
    loading: true,
    error: null,
  })

  // Generate random username
  const generateRandomUsername = () => {
    const adjectives = ["Cool", "Smart", "Fast", "Bright", "Swift", "Bold", "Sharp", "Quick", "Wise", "Strong"]
    const nouns = ["Trader", "Builder", "Creator", "Genius", "Master", "Expert", "Pro", "Wizard", "Hero", "Legend"]
    const randomNum = Math.floor(Math.random() * 1000)
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    return `${adjective}${noun}${randomNum}`
  }

  // Detect available wallets
  const detectWallets = useCallback(() => {
    const wallets: WalletAdapter[] = [
      {
        name: "Phantom",
        icon: "/phantom-logo.png", // Updated to use Phantom logo image
        url: "https://phantom.app/",
        readyState: typeof window !== "undefined" && window.solana?.isPhantom ? "Installed" : "NotDetected",
      },
      {
        name: "Solflare",
        icon: "/solflare-logo.png", // Updated to use Solflare logo image
        url: "https://solflare.com/",
        readyState: typeof window !== "undefined" && window.solflare ? "Installed" : "NotDetected",
      },
    ]
    setAvailableWallets(wallets)
  }, [])

  // Connect to specific wallet
  const connectToWallet = async (walletName: string) => {
    setIsConnecting(true)
    try {
      let wallet: any = null
      let publicKey = ""

      switch (walletName) {
        case "Phantom":
          if (window.solana?.isPhantom) {
            const response = await window.solana.connect()
            wallet = window.solana
            publicKey = response.publicKey.toString()
          }
          break
        case "Solflare":
          if (window.solflare) {
            await window.solflare.connect()
            wallet = window.solflare
            publicKey = window.solflare.publicKey.toString()
          }
          break
      }

      if (wallet && publicKey) {
        setWalletAddress(publicKey)
        setWalletConnected(true)
        setConnectedWallet(wallet)
        setShowWalletModal(false)

        await checkOrCreateUser(publicKey)

        console.log(`${walletName} wallet connected:`, publicKey)
      } else {
        throw new Error("Failed to connect to wallet")
      }
    } catch (error: any) {
      console.error(`Failed to connect to ${walletName}:`, error)

      // Check if the error is due to user rejection
      if (error?.message?.includes("User rejected") || error?.code === 4001) {
        console.log("User cancelled wallet connection")
        // Just close the modal, don't create any account
        setShowWalletModal(false)
      } else {
        // For other errors (not user cancellation), show error message
        alert(`Failed to connect wallet: ${error?.message || "Unknown error"}`)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  // Check if user exists or create new user
  const checkOrCreateUser = async (walletAddress: string) => {
    try {
      // Check if user exists
      const checkResponse = await fetch(`/api/users?wallet=${walletAddress}`)

      if (checkResponse.ok) {
        const userData = await checkResponse.json()
        if (userData.user) {
          setUserProfile(userData.user)
          return
        }
      }

      // User doesn't exist, create new user with random username
      const randomUsername = generateRandomUsername()
      const createResponse = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          username: randomUsername,
        }),
      })

      if (createResponse.ok) {
        const newUser = await createResponse.json()
        setUserProfile(newUser.user)
        setProfileForm({
          username: randomUsername,
          profilePicture: null,
          profilePicturePreview: "",
        })
        setShowProfileSetup(true)
      }
    } catch (error) {
      console.error("Error checking/creating user:", error)
      // For demo purposes, create a mock user
      const mockUser: UserProfile = {
        id: 1,
        wallet_address: walletAddress,
        username: generateRandomUsername(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setUserProfile(mockUser)
      setProfileForm({
        username: mockUser.username,
        profilePicture: null,
        profilePicturePreview: "",
      })
      setShowProfileSetup(true)
    }
  }

  // Handle profile picture upload
  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileForm((prev) => ({ ...prev, profilePicture: file }))

      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileForm((prev) => ({ ...prev, profilePicturePreview: e.target?.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameError("")
      return
    }

    setIsCheckingUsername(true)
    try {
      const response = await fetch(
        `/api/users/check-username?username=${encodeURIComponent(username)}&wallet=${encodeURIComponent(walletAddress)}`,
      )
      const data = await response.json()

      if (data.available) {
        setUsernameError("")
      } else {
        setUsernameError("Username already taken")
      }
    } catch (error) {
      console.error("Error checking username:", error)
    } finally {
      setIsCheckingUsername(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (profileForm.username) {
        checkUsernameAvailability(profileForm.username)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [profileForm.username])

  // Handle profile setup submission
  const handleProfileSetup = async () => {
    if (usernameError) {
      return
    }

    try {
      let profilePictureUrl = profileForm.profilePicturePreview

      // Upload profile picture to Vercel Blob if a new file was selected
      if (profileForm.profilePicture) {
        const uploadFormData = new FormData()
        uploadFormData.append("file", profileForm.profilePicture)

        const uploadResponse = await fetch("/api/upload-profile-picture", {
          method: "POST",
          body: uploadFormData,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          profilePictureUrl = uploadData.url
        }
      }

      // Update user profile with the Blob URL
      const formData = new FormData()
      formData.append("wallet_address", walletAddress)
      formData.append("username", profileForm.username)
      if (profilePictureUrl) {
        formData.append("profile_picture_url", profilePictureUrl)
      }

      const response = await fetch("/api/users/update", {
        method: "PUT",
        body: formData,
      })

      if (response.status === 409) {
        setUsernameError("Username already taken")
        return
      }

      if (response.ok) {
        const updatedUser = await response.json()
        setUserProfile(updatedUser.user)
        setShowProfileSetup(false)
        setIsEditingProfile(false)
        setUsernameError("")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      // For demo purposes, just update local state
      if (userProfile) {
        const updatedProfile = {
          ...userProfile,
          username: profileForm.username,
          profile_picture_url: profileForm.profilePicturePreview || undefined,
        }
        setUserProfile(updatedProfile)
        setShowProfileSetup(false)
        setIsEditingProfile(false)
      }
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletConnected(false)
    setWalletAddress("")
    setConnectedWallet(null)
    setUserProfile(null)
    setShowUserDropdown(false)
    console.log("Wallet disconnected")
  }

  // Initialize wallet detection on component mount
  useEffect(() => {
    detectWallets()
  }, [detectWallets])

  const fetchLiveStats = async () => {
    try {
      const response = await fetch(
        "https://api.dexscreener.com/latest/dex/search?q=AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn",
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        },
      )
      const data = await response.json()

      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0] // Get the first pair
        setTokenData({
          price: Number.parseFloat(pair.priceUsd) || 0,
          priceChange24h: Number.parseFloat(pair.priceChange?.h24) || 0,
          marketCap: Number.parseFloat(pair.marketCap) || 0,
          volume24h: Number.parseFloat(pair.volume?.h24) || 0,
          loading: false,
          error: null,
        })
      } else {
        setTokenData((prev) => ({ ...prev, loading: false, error: "No data found" }))
      }
    } catch (error) {
      console.error("Error fetching token data:", error)
      setTokenData((prev) => ({ ...prev, loading: false, error: "Failed to fetch data" }))
    }
  }

  useEffect(() => {
    fetchLiveStats()
    // Refresh data every 30 seconds
    const interval = setInterval(fetchLiveStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchRewardsData = async () => {
    try {
      const response = await fetch("/api/rewards")
      const result = await response.json()

      if (result.success && result.data) {
        setRewardsData({
          totalSolDistributed: result.data.totalSolDistributed || 0,
          totalDistributions: result.data.totalDistributions || 0,
          minimumRequired: result.data.minimumRequired || 0,
          loading: false,
          error: null,
          hasData: true,
        })
      } else {
        setRewardsData((prev) => ({
          ...prev,
          loading: false,
          error: "No rewards data found",
          hasData: false,
        }))
      }
    } catch (error) {
      console.error("Error fetching rewards data:", error)
      setRewardsData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to fetch rewards data",
        hasData: false,
      }))
    }
  }

  // Updated fetchOverviewData function
  const fetchOverviewData = async () => {
    try {
      setOverviewData((prev) => ({ ...prev, loading: true, error: null }))

      const response = await fetch("/api/overview")
      const result = await response.json()

      if (result.success && result.data) {
        setOverviewData({
          tokensBurned: result.data.tokensBurned || 0,
          circulatingSupply: result.data.circulatingSupply || 0,
          rewardsDistributed: result.data.rewardsDistributed || 0,
          loading: false,
          error: null,
        })
      } else {
        setOverviewData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to fetch overview data",
        }))
      }
    } catch (error) {
      console.error("[v0] Error fetching overview data:", error)
      setOverviewData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to fetch overview data",
      }))
    }
  }

  useEffect(() => {
    fetchRewardsData()
    fetchOverviewData() // Added fetchOverviewData to load on mount regardless of wallet connection
    // Refresh rewards data every 60 seconds
    const interval = setInterval(fetchRewardsData, 60000)
    const overviewInterval = setInterval(fetchOverviewData, 60000)
    return () => {
      clearInterval(interval)
      clearInterval(overviewInterval)
    }
  }, [])

  const fetchDistributionsData = async () => {
    try {
      const response = await fetch("/api/distributions")
      const result = await response.json()

      if (result.success && result.data) {
        setDistributionsData({
          distributions: result.data,
          loading: false,
          error: null,
        })
      } else {
        setDistributionsData((prev) => ({ ...prev, loading: false, error: "No distributions data found" }))
      }
    } catch (error) {
      console.error("Error fetching distributions data:", error)
      setDistributionsData((prev) => ({ ...prev, loading: false, error: "Failed to fetch distributions data" }))
    }
  }

  useEffect(() => {
    fetchDistributionsData()
    // Refresh distributions data every 60 seconds
    const interval = setInterval(fetchDistributionsData, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Simulate system initialization
    const initTimer = setTimeout(() => {
      setIsLoading(false)
    }, 2000) // 2 second initialization

    return () => clearTimeout(initTimer)
  }, [])

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [])

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatPrice = (price: number) => {
    if (price < 0.01) return `$${price.toFixed(6)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toFixed(2)}`
  }

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`
    if (marketCap >= 1e3) return `$${(marketCap / 1e3).toFixed(2)}K`
    return `$${marketCap.toFixed(2)}`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`
    return `$${volume.toFixed(2)}`
  }

  const formatRewardsNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const formatDateTime = (dateString: string) => {
    let date
    if (dateString.includes("T")) {
      // ISO format
      date = new Date(dateString)
    } else {
      // "2025-09-27 21:42:02" format from API
      date = new Date(dateString.replace(" ", "T") + "Z")
    }

    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    }
  }

  const calculateUptime = () => {
    if (distributionsData.loading || distributionsData.distributions.length === 0) {
      return "Calculating..."
    }

    // Find the oldest distribution (last in the sorted array since it's sorted newest first)
    const oldestDistribution = distributionsData.distributions[distributionsData.distributions.length - 1]
    if (!oldestDistribution) return "No data"

    // Parse the date from the distribution
    const firstDistributionDate = new Date(oldestDistribution.dateTime.replace(" ", "T"))
    const now = new Date()
    const diffMs = now.getTime() - firstDistributionDate.getTime()

    // Calculate days, hours, minutes, seconds
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

    return `${days}d ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const refreshAllData = async () => {
    setIsRefreshing(true)
    try {
      // Fetch token data from DexScreener
      const tokenResponse = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn",
      )

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()

        if (tokenData.pairs && tokenData.pairs.length > 0) {
          const pair = tokenData.pairs[0]
          setTokenData({
            price: Number.parseFloat(pair.priceUsd) || 0,
            priceChange24h: Number.parseFloat(pair.priceChange?.h24) || 0,
            marketCap: Number.parseFloat(pair.fdv) || 0,
            volume24h: Number.parseFloat(pair.volume?.h24) || 0,
            loading: false,
            error: null,
          })
        } else {
          setTokenData((prev) => ({ ...prev, loading: false, error: "No data found" }))
        }
      }

      // Fetch rewards data
      const rewardsResponse = await fetch("https://revshare.fun/api/token/AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn")
      if (rewardsResponse.ok) {
        const rewardsData = await rewardsResponse.json()
        setRewardsData({
          totalSolDistributed: rewardsData.totalSolDistributed || 0,
          totalDistributions: rewardsData.totalDistributions || 0,
          minimumRequired: rewardsData.minimumRequired || 0,
          loading: false,
          hasData: true,
          error: null,
        })
      } else {
        setRewardsData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to fetch rewards data",
        }))
      }

      await fetchOverviewData()
    } catch (error) {
      console.error("[v0] Error refreshing data:", error)
      setTokenData((prev) => ({ ...prev, loading: false, error: "Failed to refresh data" }))
      setRewardsData((prev) => ({ ...prev, loading: false, error: "Failed to refresh data" }))
      setOverviewData((prev) => ({ ...prev, loading: false, error: "Failed to refresh data" }))
    } finally {
      setIsRefreshing(false)
    }
  }

  // CHANGE START: Updated fetchExploreTokens to enrich tokens with DexScreener data
  const fetchExploreTokens = async () => {
    try {
      setExploreTokensLoading(true)
      const response = await fetch("/api/tokens")
      const data = await response.json()
      console.log("[v0] Fetched tokens from DB:", data)

      if (data.success && Array.isArray(data.tokens)) {
        // Enrich each token with DexScreener data
        const enrichedTokens = await Promise.all(
          data.tokens.map(async (token) => {
            try {
              // Fetch DexScreener data for this token
              const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.mint_address}`)

              if (dexResponse.ok) {
                const dexData = await dexResponse.json()

                if (dexData.pairs && dexData.pairs.length > 0) {
                  const pair = dexData.pairs[0]
                  return {
                    ...token,
                    price: Number.parseFloat(pair.priceUsd) || 0,
                    priceChange24h: Number.parseFloat(pair.priceChange?.h24) || 0,
                    volume24h: Number.parseFloat(pair.volume?.h24) || 0,
                    marketCap: Number.parseFloat(pair.fdv || pair.marketCap) || 0,
                  }
                }
              }

              // Return token without market data if DexScreener fetch fails
              return token
            } catch (error) {
              console.error(`[v0] Error fetching DexScreener data for ${token.symbol}:`, error)
              return token
            }
          }),
        )

        console.log("[v0] Enriched tokens with DexScreener data:", enrichedTokens)
        setExploreTokens(enrichedTokens)
      } else {
        setExploreTokens([])
      }
    } catch (error) {
      console.error("[v0] Error fetching tokens:", error)
      setExploreTokens([])
    } finally {
      setExploreTokensLoading(false)
    }
  }
  // END CHANGE

  useEffect(() => {
    if (activeView === "explore") {
      fetchExploreAgents()
      fetchExploreTokens()

      const interval = setInterval(() => {
        fetchExploreAgents()
        fetchExploreTokens()
      }, 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [activeView])

  const fetchExploreAgents = async () => {
    setExploreLoading(true)
    try {
      const response = await fetch("/api/public-ai-agents")
      const data = await response.json()

      if (data.success) {
        setExploreAgents(data.agents)
      } else {
        console.error("Failed to fetch AI agents:", data.error)
      }
    } catch (error) {
      console.error("Error fetching AI agents:", error)
    } finally {
      setExploreLoading(false)
    }
  }

  // Fetch single AI configuration
  const fetchAIConfiguration = async (idOrName: string) => {
    try {
      // Check if it's a numeric ID
      const isNumericId = /^\d+$/.test(idOrName)
      const endpoint = isNumericId ? `/api/ai-configurations/${idOrName}` : `/api/ai-configurations/by-name/${idOrName}`

      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`Failed to fetch AI configuration: ${response.status}`)
      }

      const data = await response.json()

      // Handle different response structures
      const agent = data.agent || data
      setCurrentChatAgent(agent)
    } catch (error) {
      console.error("Error fetching AI configuration:", error)
      throw error
    }
  }

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !currentChatAgent) return

    const userMessage = { role: "user", content: chatInput }
    const newMessages = [...chatMessages, userMessage]
    setChatMessages(newMessages)
    setChatInput("")
    setChatLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          model: currentChatAgent.model,
          systemPrompt: currentChatAgent.prompt,
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          const chunk = decoder.decode(value, { stream: true })

          const lines = chunk.split("\n").filter((line) => line.trim())

          for (const line of lines) {
            // Skip empty lines and [DONE] marker
            if (!line.trim() || line === "data: [DONE]") continue

            // Parse SSE format: "data: {...}"
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6).trim() // Remove "data: " prefix
                const parsed = JSON.parse(jsonStr) // Corrected from JSON.Parse

                // Extract text from text-delta events
                if (parsed.type === "text-delta" && parsed.delta) {
                  assistantMessage += parsed.delta

                  // Update messages with current assistant response
                  setChatMessages([...newMessages, { role: "assistant", content: assistantMessage }])
                }
              } catch (e) {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      }

      // Final update with complete message
      if (assistantMessage) {
        setChatMessages([...newMessages, { role: "assistant", content: assistantMessage }])
      } else {
        // If no message was received, show an error
        setChatMessages([
          ...newMessages,
          { role: "assistant", content: "I received your message but couldn't generate a response. Please try again." },
        ])
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  const handleCreateAI = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first")
      return
    }

    if (!aiForm.name || !aiForm.prompt) {
      alert("Please fill in all required fields (Name and Prompt)")
      return
    }

    try {
      // Prepare form data for API
      const formData = new FormData()
      formData.append("walletAddress", walletAddress)
      formData.append("name", aiForm.name)
      formData.append("description", aiForm.description)
      formData.append("prompt", aiForm.prompt)
      formData.append("model", aiForm.model)
      formData.append("toolsWebSearch", aiForm.tools.webSearch.toString())
      formData.append("toolsCodeExecution", aiForm.tools.codeExecution.toString())
      formData.append("toolsImageGeneration", aiForm.tools.imageGeneration.toString())
      formData.append("toolsDataAnalysis", aiForm.tools.dataAnalysis.toString())
      formData.append("isPublic", aiForm.isPublic.toString())

      // Append knowledge base files
      aiForm.knowledgeBase.forEach((file) => {
        formData.append("knowledgeBase", file)
      })

      const response = await fetch("/api/ai-configurations", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save configuration")
      }

      const newAgentId = data.configuration.id

      fetchExploreAgents()
      // fetchAllConfigurations() // This function is undeclared, assuming it's not critical for now.

      // Reset form after successful save
      setAiForm({
        name: "",
        description: "",
        prompt: "",
        model: "gemini-2.5-flash",
        temperature: [0.7],
        maxTokens: [2048],
        tools: {
          webSearch: false,
          codeExecution: false,
          imageGeneration: false,
          dataAnalysis: false,
        },
        knowledgeBase: [],
        isPublic: true,
      })

      window.location.hash = `chat-${newAgentId}`
      setActiveView("chat") // Use setActiveView instead of setActiveSection
      setCurrentChatAgent(data.configuration)
      setChatMessages([])
    } catch (error) {
      console.error("Error creating AI configuration:", error)
      alert(`Failed to create AI configuration: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const systemAlerts = [
    {
      id: 1,
      title: "Token Creation Complete",
      time: "16:45:23",
      description: "Token successfully deployed to blockchain",
      type: "success" as const,
    },
    {
      id: 2,
      title: "Initial Dex Offering Detected",
      time: "15:32:18",
      description: "IDO launch detected on decentralized exchange",
      type: "info" as const,
    },
    {
      id: 3,
      title: "AI Creation Available",
      time: "14:28:45",
      description: "AI model generation system is now online",
      type: "update" as const,
    },
    {
      id: 4,
      title: "Launch Completed",
      time: "12:15:30",
      description: "Project launch sequence successfully executed",
      type: "success" as const,
    },
  ]

  const connectWallet = async () => {
    setShowWalletModal(true)
  }

  // CHANGE START: Removed wallet connection check - form now always visible
  const renderLaunchToken = () => {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-500/20 rounded-lg flex-shrink-0">
                <DollarSign className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl text-slate-100">New Coin</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Tokenize your AI agent. Launch on Solana and earn fees from every transaction.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-auto">
                <Button
                  onClick={() => {
                    setShowAgentDropdown(!showAgentDropdown)
                    if (!showAgentDropdown && aiAgents.length === 0) {
                      fetchAiAgents()
                    }
                  }}
                  variant="outline"
                  className="w-full sm:w-auto bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50 hover:border-slate-500 transition-colors h-10"
                  disabled={isGeneratingFromAgent}
                >
                  {isGeneratingFromAgent ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generating...
                    </>
                  ) : selectedAgent ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                      {selectedAgent.name}
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Select AI Agent
                    </>
                  )}
                </Button>

                {showAgentDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-full sm:w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
                    <button
                      onClick={handleNewAgent}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700"
                    >
                      <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-500/20 rounded-lg">
                        <Plus className="h-4 w-4 text-cyan-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-slate-100">New Agent</div>
                        <div className="text-xs text-slate-400">Create a new AI agent</div>
                      </div>
                    </button>

                    <div className="overflow-y-auto flex-1">
                      {isLoadingAgents ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                        </div>
                      ) : aiAgents.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-400 text-sm">No AI agents found</div>
                      ) : (
                        <>
                          {console.log("[v0] Rendering", aiAgents.length, "agents in dropdown")}
                          {aiAgents.map((agent) => (
                            <button
                              key={agent.id}
                              onClick={() => handleAgentSelect(agent)}
                              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-b-0"
                            >
                              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500/20 rounded-lg">
                                <Bot className="h-4 w-4 text-purple-400" />
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <div className="font-semibold text-slate-100 truncate">{agent.name}</div>
                                {agent.username && (
                                  <div className="text-xs text-slate-500 mt-1">by @{agent.username}</div>
                                )}
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {walletConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWallet}
                  className="w-full sm:w-auto border-slate-600 text-white bg-transparent hover:bg-slate-700/50 h-10"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                </Button>
              ) : (
                <Button
                  onClick={connectWallet}
                  className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white h-10"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-6">
            {launchSuccess && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Token launched successfully!</span>
                </div>
                <p className="text-sm text-slate-300 mt-2">Your token has been created and is now live on Solana.</p>
              </div>
            )}

            {launchError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Launch failed</span>
                </div>
                <p className="text-sm text-slate-300 mt-2">{launchError}</p>
              </div>
            )}

            <div className="flex justify-center">
              <div className="relative">
                <div
                  className={cn(
                    "relative border-2 border-dashed transition-all duration-200 rounded-full w-32 h-32",
                    "border-slate-600 hover:border-slate-500",
                  )}
                >
                  {tokenForm.imageUrl ? (
                    <>
                      <img
                        src={tokenForm.imageUrl || "/placeholder.svg"}
                        alt="Token preview"
                        className="w-full h-full object-cover rounded-full"
                      />
                      <button
                        type="button"
                        onClick={() => setTokenForm({ ...tokenForm, imageUrl: "" })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            try {
                              const formData = new FormData()
                              formData.append("file", file)
                              const response = await fetch("/api/upload", {
                                method: "POST",
                                body: formData,
                              })
                              if (!response.ok) throw new Error("Upload failed")
                              const { url } = await response.json()
                              setTokenForm({ ...tokenForm, imageUrl: url })
                            } catch (error) {
                              console.error("Image upload failed:", error)
                            }
                          }
                        }}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Upload className="h-8 w-8 mb-2" />
                        <p className="text-xs text-center px-4">Upload Image</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Token Name */}
              <div className="space-y-2">
                <Label htmlFor="token-name" className="text-slate-300 flex items-center gap-2">
                  Token Name
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">The full name of your token (e.g., "AiFi Token")</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="token-name"
                  value={tokenForm.name}
                  onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
                  placeholder="e.g., AiFi Token"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                />
              </div>

              {/* Token Symbol */}
              <div className="space-y-2">
                <Label htmlFor="token-symbol" className="text-slate-300 flex items-center gap-2">
                  Token Symbol
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">The ticker symbol for your token (e.g., "AIFI")</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="token-symbol"
                  value={tokenForm.symbol}
                  onChange={(e) => setTokenForm({ ...tokenForm, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., AIFI"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="token-description" className="text-slate-300 flex items-center gap-2">
                Description
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">A brief description of your token and its purpose</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Textarea
                id="token-description"
                value={tokenForm.description}
                onChange={(e) => setTokenForm({ ...tokenForm, description: e.target.value })}
                placeholder="Describe your token's purpose and utility..."
                className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500 min-h-[100px]"
              />
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">Social Links (Optional)</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Twitter */}
                <div className="space-y-2">
                  <Label htmlFor="token-twitter" className="text-slate-300">
                    Twitter
                  </Label>
                  <Input
                    id="token-twitter"
                    value={tokenForm.twitter}
                    onChange={(e) => setTokenForm({ ...tokenForm, twitter: e.target.value })}
                    placeholder="https://twitter.com/..."
                    className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                  />
                </div>

                {/* Telegram */}
                <div className="space-y-2">
                  <Label htmlFor="token-telegram" className="text-slate-300">
                    Telegram
                  </Label>
                  <Input
                    id="token-telegram"
                    value={tokenForm.telegram}
                    onChange={(e) => setTokenForm({ ...tokenForm, telegram: e.target.value })}
                    placeholder="https://t.me/..."
                    className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                  />
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="token-website" className="text-slate-300">
                    Website
                  </Label>
                  <Input
                    id="token-website"
                    value={tokenForm.website}
                    onChange={(e) => setTokenForm({ ...tokenForm, website: e.target.value })}
                    placeholder="https://..."
                    className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {selectedPlatform === "meteora" && (
              <div className="space-y-2">
                <Label htmlFor="initial-buy" className="text-slate-300 flex items-center gap-2">
                  Initial Buy Amount (SOL)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Amount of SOL to use for initial token purchase (minimum 0.1 SOL)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="initial-buy"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={tokenForm.initialBuyAmount}
                  onChange={(e) => setTokenForm({ ...tokenForm, initialBuyAmount: e.target.value })}
                  placeholder="0.1"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                />
              </div>
            )}

            {selectedPlatform === "pumpfun" && (
              <div className="space-y-2">
                <Label htmlFor="initial-buy-pumpfun" className="text-slate-300 flex items-center gap-2">
                  Initial Buy Amount (SOL)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Amount of SOL for dev buy (minimum 1 SOL recommended)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="initial-buy-pumpfun"
                  type="number"
                  step="0.1"
                  min="1"
                  value={tokenForm.initialBuyAmount}
                  onChange={(e) => setTokenForm({ ...tokenForm, initialBuyAmount: e.target.value })}
                  placeholder="1"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                />
              </div>
            )}

            {selectedPlatform === "raydium" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pool-tax-mobile" className="text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      Pool Tax
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-slate-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Pool fee tier (1-4%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span className="text-cyan-400 font-semibold">{tokenForm.poolTax}%</span>
                  </Label>
                  <Slider
                    id="pool-tax-mobile"
                    min={1}
                    max={4}
                    step={0.1}
                    value={[Number.parseFloat(tokenForm.poolTax)]}
                    onValueChange={(value) => setTokenForm({ ...tokenForm, poolTax: value[0].toString() })}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>1%</span>
                    <span>4%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-fee-mobile" className="text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      Dev Fee
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-slate-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Developer fee percentage (0-100%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span className="text-cyan-400 font-semibold">{tokenForm.devFeePercentage}%</span>
                  </Label>
                  <Slider
                    id="dev-fee-mobile"
                    min={0}
                    max={100}
                    step={1}
                    value={[Number.parseFloat(tokenForm.devFeePercentage)]}
                    onValueChange={(value) => setTokenForm({ ...tokenForm, devFeePercentage: value[0].toString() })}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="liquidity-amount-mobile" className="text-slate-300 flex items-center gap-2">
                    Liquidity Amount (SOL)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-slate-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Initial liquidity to add to the pool (minimum 0.1 SOL)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="liquidity-amount-mobile"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tokenForm.liquidityAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "" || Number.parseFloat(value) >= 0) {
                        setTokenForm({ ...tokenForm, liquidityAmount: value })
                      }
                    }}
                    placeholder="0.1"
                    className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                  />
                  <p className="text-xs text-slate-400">0.1 minimum liquidity</p>
                </div>
              </div>
            )}

            {/* Launch Button */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={
                  selectedPlatform === "meteora"
                    ? handleTokenLaunch
                    : selectedPlatform === "pumpfun"
                      ? handlePumpFunLaunch
                      : handleRaydiumLaunch
                }
                disabled={
                  !walletConnected ||
                  isLaunchingToken ||
                  !tokenForm.name ||
                  !tokenForm.symbol ||
                  !tokenForm.description ||
                  !tokenForm.imageUrl ||
                  (selectedPlatform === "raydium" &&
                    (!tokenForm.liquidityAmount || Number.parseFloat(tokenForm.liquidityAmount) < 0.1)) // Added liquidity amount check to disable launch button
                }
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLaunchingToken ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Launching Token...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Launch on{" "}
                    {selectedPlatform === "meteora"
                      ? "Meteora"
                      : selectedPlatform === "pumpfun"
                        ? "PumpFun"
                        : "Raydium"}
                  </>
                )}
              </Button>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-cyan-400 mb-1">Cost Breakdown</p>
                  {selectedPlatform === "meteora" && <p>0.05 SOL for token creation + initial buy amount</p>}
                  {selectedPlatform === "pumpfun" && <p>~0.02 SOL for token creation + initial buy amount (1% tax)</p>}
                  {selectedPlatform === "raydium" && <p>Funding amount varies + liquidity pool creation (1-4% tax)</p>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleTokenLaunch = async () => {
    if (!walletConnected || !walletAddress) {
      setLaunchError("Please connect your wallet first")
      return
    }

    if (!connectedWallet) {
      setLaunchError("Wallet not properly connected")
      return
    }

    setIsLaunchingToken(true)
    setLaunchError(null)
    setLaunchSuccess(false)

    try {
      console.log("[v0] Starting Meteora token launch process")

      const { prepareToken, finalizeTokenCreation } = await import("@/lib/revshare")
      const { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import("@solana/web3.js")

      // Step 1: Prepare token creation
      console.log("[v0] Step 1: Preparing token creation...")
      const sdk = {
        prepareToken,
        finalizeTokenCreation,
      }

      const initialBuyAmount = Number.parseFloat(tokenForm.initialBuyAmount) || 0.1

      const preparedData = await prepareToken(sdk, {
        name: tokenForm.name,
        ticker: tokenForm.symbol,
        description: tokenForm.description,
        imageUrl: tokenForm.imageUrl,
        developerWallet: walletAddress,
        website: tokenForm.website || undefined,
        twitter: tokenForm.twitter || undefined,
        telegram: tokenForm.telegram || undefined,
        visible: 0,
        decimals: 9,
        initialBuyAmount: initialBuyAmount,
      })

      console.log("[v0] Prepared data:", preparedData)
      console.log("[v0] Funding wallet:", preparedData.funding_wallet)

      const totalFundingAmount = preparedData.amount_to_fund + initialBuyAmount

      console.log(
        "[v0] Total funding amount:",
        totalFundingAmount,
        "SOL (amount_to_fund:",
        preparedData.amount_to_fund,
        "+ initial buy:",
        initialBuyAmount,
        ")",
      )

      // Step 2: Create and send funding transaction
      console.log("[v0] Step 2: Creating funding transaction...")

      const connection = new (await import("@solana/web3.js")).Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.mainnet-beta.solana.com",
      )

      // Create transaction to fund distribution wallet
      const { blockhash } = await connection.getLatestBlockhash()
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(walletAddress),
          toPubkey: new PublicKey(preparedData.funding_wallet),
          lamports: Math.round(totalFundingAmount * LAMPORTS_PER_SOL),
        }),
      )
      transaction.recentBlockhash = blockhash
      transaction.feePayer = new PublicKey(walletAddress)

      console.log("[v0] Sending funding transaction...")

      // Use the wallet's signAndSendTransaction or signTransaction method
      let signature: string
      if (connectedWallet.signAndSendTransaction) {
        const { signature: sig } = await connectedWallet.signAndSendTransaction(transaction)
        signature = sig
      } else if (connectedWallet.signTransaction) {
        const signedTx = await connectedWallet.signTransaction(transaction)
        signature = await connection.sendRawTransaction(signedTx.serialize())
      } else {
        throw new Error("Wallet does not support transaction signing")
      }

      console.log("[v0] Funding transaction signature:", signature)

      console.log("[v0] Confirming transaction...")
      await connection.confirmTransaction(signature, "finalized")
      console.log("[v0] Transaction confirmed!")

      // Step 3: Finalize token creation
      console.log("[v0] Step 3: Finalizing token creation...")
      const { mint } = await finalizeTokenCreation(sdk, {
        request_id: preparedData.request_id,
        name: tokenForm.name,
        ticker: tokenForm.symbol,
        description: tokenForm.description,
        imageUrl: tokenForm.imageUrl,
        developerWallet: walletAddress,
        website: tokenForm.website || undefined,
        twitter: tokenForm.twitter || undefined,
        telegram: tokenForm.telegram || undefined,
        visible: 0,
        decimals: 9,
        initialBuyAmount: initialBuyAmount,
      })

      console.log("[v0] Token created with mint address:", mint)

      // Save to database
      console.log("[v0] Saving token to database...")
      await fetch("/api/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mint_address: mint,
          request_id: preparedData.request_id,
          name: tokenForm.name,
          symbol: tokenForm.symbol,
          description: tokenForm.description,
          image_url: tokenForm.imageUrl,
          creator_wallet: walletAddress,
          developer_wallet: walletAddress,
          initial_buy_amount: initialBuyAmount,
          initial_supply: 1000000000,
          decimals: 9,
          website: tokenForm.website || null,
          twitter: tokenForm.twitter || null,
          telegram: tokenForm.telegram || null,
          platform: "meteora",
        }),
      })

      setLaunchSuccess(true)

      setTimeout(() => {
        setTokenForm({
          name: "",
          symbol: "",
          description: "",
          imageUrl: "",
          twitter: "",
          telegram: "",
          website: "",
          initialBuyAmount: "0.1",
          poolTax: "4",
          mode: "0",
          devFeePercentage: "50",
          liquidityAmount: "0.1",
        })
        setLaunchSuccess(false)
        setSelectedPlatform(null)
        window.open(`https://solscan.io/token/${mint}`, "_blank")
      }, 3000)
    } catch (error: any) {
      console.error("[v0] Error creating token:", error)
      setLaunchError(error.message || "Failed to create token. Please try again.")
    } finally {
      setIsLaunchingToken(false)
    }
  }

  const handlePumpFunLaunch = async () => {
    if (!walletConnected || !walletAddress) {
      setLaunchError("Please connect your wallet first")
      return
    }

    if (!connectedWallet) {
      setLaunchError("Wallet not properly connected")
      return
    }

    setIsLaunchingToken(true)
    setLaunchError(null)
    setLaunchSuccess(false)

    try {
      console.log("[v0] Starting PumpFun token launch process")

      const { uploadMetadataToPumpFun, createPumpFunTokenTransaction } = await import("@/lib/pumpfun")
      const { Keypair, VersionedTransaction, Connection } = await import("@solana/web3.js")

      // Step 1: Upload metadata to IPFS
      console.log("[v0] Step 1: Uploading metadata to IPFS...")
      const imageResponse = await fetch(tokenForm.imageUrl)
      const imageBlob = await imageResponse.blob()

      const metadataResponse = await uploadMetadataToPumpFun(
        imageBlob,
        tokenForm.name,
        tokenForm.symbol,
        tokenForm.description,
        tokenForm.twitter || undefined,
        tokenForm.telegram || undefined,
        tokenForm.website || undefined,
      )

      console.log("[v0] Metadata uploaded:", metadataResponse)

      // Step 2: Generate mint keypair
      const mintKeypair = Keypair.generate()
      console.log("[v0] Generated mint keypair:", mintKeypair.publicKey.toBase58())

      // Step 3: Create transaction
      console.log("[v0] Step 2: Creating PumpFun token transaction...")
      const initialBuyAmount = Number.parseFloat(tokenForm.initialBuyAmount) || 1

      const txBuffer = await createPumpFunTokenTransaction({
        publicKey: walletAddress,
        action: "create",
        tokenMetadata: {
          name: metadataResponse.metadata.name,
          symbol: metadataResponse.metadata.symbol,
          uri: metadataResponse.metadataUri,
        },
        mint: mintKeypair.publicKey.toBase58(),
        denominatedInSol: "true",
        amount: initialBuyAmount,
        slippage: 10,
        priorityFee: 0.0005,
        pool: "pump",
      })

      console.log("[v0] Step 3: Signing and sending transaction...")
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.mainnet-beta.solana.com",
      )

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized")

      // Deserialize the transaction
      const tx = VersionedTransaction.deserialize(new Uint8Array(txBuffer))

      // Update the transaction with fresh blockhash
      tx.message.recentBlockhash = blockhash

      // Sign with mint keypair first (partial signature)
      tx.sign([mintKeypair])
      console.log("[v0] Mint keypair signature added")

      // Then sign with wallet (completes all required signatures)
      if (!connectedWallet.signTransaction) {
        throw new Error("Wallet does not support transaction signing")
      }

      console.log("[v0] Requesting wallet signature...")
      const signedTx = await connectedWallet.signTransaction(tx)
      console.log("[v0] Wallet signature added")

      console.log("[v0] Sending transaction...")
      let signature: string
      try {
        signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        })
        console.log("[v0] Transaction sent:", signature)
      } catch (sendError: any) {
        console.error("[v0] Send transaction error:", sendError)

        // Get detailed logs if available
        if (sendError.logs) {
          console.error("[v0] Transaction logs:", sendError.logs)
          throw new Error(`Transaction failed: ${sendError.logs.join(", ")}`)
        }

        throw sendError
      }

      console.log("[v0] Confirming transaction...")
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "finalized",
      )

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }

      console.log("[v0] Transaction confirmed!")

      // Save to database
      console.log("[v0] Saving token to database...")
      await fetch("/api/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mint_address: mintKeypair.publicKey.toBase58(),
          name: tokenForm.name,
          symbol: tokenForm.symbol,
          description: tokenForm.description,
          image_url: tokenForm.imageUrl,
          creator_wallet: walletAddress,
          developer_wallet: walletAddress,
          initial_buy_amount: initialBuyAmount,
          initial_supply: 1000000000,
          decimals: 9,
          website: tokenForm.website || null,
          twitter: tokenForm.twitter || null,
          telegram: tokenForm.telegram || null,
          platform: "pumpfun",
        }),
      })

      setLaunchSuccess(true)

      setTimeout(() => {
        setTokenForm({
          name: "",
          symbol: "",
          description: "",
          imageUrl: "",
          twitter: "",
          telegram: "",
          website: "",
          initialBuyAmount: "0.1",
          poolTax: "4",
          mode: "0",
          devFeePercentage: "50",
          liquidityAmount: "0.1",
        })
        setLaunchSuccess(false)
        setSelectedPlatform(null)
        window.open(`https://solscan.io/token/${mintKeypair.publicKey.toBase58()}`, "_blank")
      }, 3000)
    } catch (error: any) {
      console.error("[v0] PumpFun launch error:", error)
      setLaunchError(error.message || "Failed to launch token on PumpFun. Please try again.")
    } finally {
      setIsLaunchingToken(false)
    }
  }

  const handleRaydiumLaunch = async () => {
    if (!walletConnected || !walletAddress) {
      setLaunchError("Please connect your wallet first")
      return
    }

    if (!connectedWallet) {
      setLaunchError("Wallet not properly connected")
      return
    }

    const liquidityAmount = Number.parseFloat(tokenForm.liquidityAmount)
    if (!tokenForm.liquidityAmount || liquidityAmount < 0.1) {
      setLaunchError("Liquidity amount must be at least 0.1 SOL")
      return
    }

    setIsLaunchingToken(true)
    setLaunchError(null)
    setLaunchSuccess(false)

    try {
      console.log("[v0] Starting Raydium token launch process")

      const { prepareRaydiumToken, createRaydiumToken } = await import("@/lib/raydium")
      const { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import("@solana/web3.js")

      // Step 1: Prepare token creation
      console.log("[v0] Step 1: Preparing Raydium token creation...")
      const preparedData = await prepareRaydiumToken()

      console.log("[v0] Prepared data:", preparedData)
      console.log("[v0] Funding wallet:", preparedData.funding_wallet)

      const totalAmountNeeded = 0.45 + liquidityAmount
      console.log(
        "[v0] Total amount needed:",
        totalAmountNeeded,
        "SOL (0.45 base fee + liquidity:",
        liquidityAmount,
        ")",
      )

      // Step 2: Fund the distribution wallet
      console.log("[v0] Step 2: Funding distribution wallet...")
      const connection = new (await import("@solana/web3.js")).Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.mainnet-beta.solana.com",
      )

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized")
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(walletAddress),
          toPubkey: new PublicKey(preparedData.funding_wallet),
          lamports: Math.round(totalAmountNeeded * LAMPORTS_PER_SOL),
        }),
      )
      transaction.recentBlockhash = blockhash
      transaction.feePayer = new PublicKey(walletAddress)

      let signature: string
      if (connectedWallet.signAndSendTransaction) {
        const { signature: sig } = await connectedWallet.signAndSendTransaction(transaction)
        signature = sig
      } else if (connectedWallet.signTransaction) {
        const signedTx = await connectedWallet.signTransaction(transaction)
        signature = await connection.sendRawTransaction(signedTx.serialize())
      } else {
        throw new Error("Wallet does not support transaction signing")
      }

      console.log("[v0] Funding transaction signature:", signature)

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "finalized",
      )

      if (confirmation.value.err) {
        throw new Error(`Funding transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }

      console.log("[v0] Funding confirmed!")

      // Step 3: Create Raydium token
      console.log("[v0] Step 3: Creating Raydium liquidity token...")
      const result = await createRaydiumToken({
        request_id: preparedData.request_id,
        name: tokenForm.name,
        ticker: tokenForm.symbol,
        description: tokenForm.description,
        imageUrl: tokenForm.imageUrl,
        developerWallet: walletAddress,
        website: tokenForm.website || undefined,
        twitter: tokenForm.twitter || undefined,
        telegram: tokenForm.telegram || undefined,
        visible: 0,
        decimals: 9,
        poolTax: Number.parseFloat(tokenForm.poolTax) || 4,
        mode: 0,
        dev_fee_percentage: Number.parseFloat(tokenForm.devFeePercentage) || 50,
        liquidityAmount: liquidityAmount,
      })

      console.log("[v0] Raydium token created:", result)

      // Save to database
      console.log("[v0] Saving token to database...")
      await fetch("/api/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mint_address: result.mintAddress,
          name: tokenForm.name,
          symbol: tokenForm.symbol,
          description: tokenForm.description,
          image_url: tokenForm.imageUrl,
          creator_wallet: walletAddress,
          developer_wallet: walletAddress,
          initial_supply: 1000000000,
          decimals: 9,
          website: tokenForm.website || null,
          twitter: tokenForm.twitter || null,
          telegram: tokenForm.telegram || null,
          platform: "raydium",
          pool_tax: Number.parseFloat(tokenForm.poolTax),
        }),
      })

      setLaunchSuccess(true)

      setTimeout(() => {
        setTokenForm({
          name: "",
          symbol: "",
          description: "",
          imageUrl: "",
          twitter: "",
          telegram: "",
          website: "",
          initialBuyAmount: "0.1",
          poolTax: "4",
          mode: "0",
          devFeePercentage: "50",
          // Reset liquidityAmount as well
          liquidityAmount: "0.1",
        })
        setLaunchSuccess(false)
        setSelectedPlatform(null)
        window.open(`https://solscan.io/token/${result.mintAddress}`, "_blank")
      }, 3000)
    } catch (error: any) {
      console.error("[v0] Raydium launch error:", error)
      setLaunchError(error.message || "Failed to launch token on Raydium. Please try again.")
    } finally {
      setIsLaunchingToken(false)
    }
  }

  const renderNewCoinSection = () => {
    if (!selectedPlatform) {
      return (
        <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-700 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-100">New Coin</CardTitle>
                <p className="text-sm text-slate-400 mt-1">Choose your token launch platform</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Meteora Option */}
              <button
                onClick={() => setSelectedPlatform("meteora")}
                className="group relative bg-slate-800/50 border-2 border-slate-700 hover:border-cyan-500 rounded-lg p-6 transition-all duration-200 text-left"
              >
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded">
                    Bonding Curve
                  </span>
                </div>
                <div className="flex justify-start mb-4 mt-2">
                  <img src="/logo-meteora-symbol-onDark.webp" alt="Meteora" className="w-12 h-12 object-contain" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">Meteora</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Launch with flexible bonding curve options and customizable tax tiers
                </p>
                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    <span>6% or 10% tax options</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    <span>Multiple distribution modes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    <span>RevShare integration</span>
                  </div>
                </div>
              </button>

              {/* PumpFun Option */}
              <button
                onClick={() => setSelectedPlatform("pumpfun")}
                className="group relative bg-slate-800/50 border-2 border-slate-700 hover:border-purple-500 rounded-lg p-6 transition-all duration-200 text-left"
              >
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded">
                    Bonding Curve
                  </span>
                </div>
                <div className="flex justify-start mb-4 mt-2">
                  <img src="/pumpfun-logo.png" alt="PumpFun" className="w-12 h-12 object-contain" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">PumpFun</h3>
                <p className="text-sm text-slate-400 mb-4">Fast and simple token launch with low fees</p>
                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>1% tax</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>Quick deployment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>High Visibility</span>
                  </div>
                </div>
              </button>

              {/* Raydium Option */}
              <button
                onClick={() => setSelectedPlatform("raydium")}
                className="group relative bg-slate-800/50 border-2 border-slate-700 hover:border-green-500 rounded-lg p-6 transition-all duration-200 text-left"
              >
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                    Liquidity
                  </span>
                </div>
                <div className="flex justify-start mb-4 mt-2">
                  <img src="/raydium-ray-logo.png" alt="Raydium" className="w-12 h-12 object-contain" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">Raydium</h3>
                <p className="text-sm text-slate-400 mb-4">Launch with instant liquidity pool on Raydium DEX</p>
                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>1-4% tax (customizable)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Instant liquidity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>DEX integration</span>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-700 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPlatform(null)}
                className="text-slate-400 hover:text-slate-100"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  {selectedPlatform === "meteora" && (
                    <img src="/logo-meteora-symbol-onDark.webp" alt="Meteora" className="w-8 h-8 object-contain" />
                  )}
                  {selectedPlatform === "pumpfun" && (
                    <img src="/pumpfun-logo.png" alt="PumpFun" className="w-8 h-8 object-contain" />
                  )}
                  {selectedPlatform === "raydium" && (
                    <img src="/raydium-ray-logo.png" alt="Raydium" className="w-8 h-8 object-contain" />
                  )}
                  <div>
                    <CardTitle className="text-xl text-slate-100">
                      New Coin -{" "}
                      {selectedPlatform === "meteora"
                        ? "Meteora"
                        : selectedPlatform === "pumpfun"
                          ? "PumpFun"
                          : "Raydium"}
                    </CardTitle>
                    <p className="text-sm text-slate-400 mt-1">
                      {selectedPlatform === "meteora" && "Tokenize your AI agent with Meteora bonding curve"}
                      {selectedPlatform === "pumpfun" && "Launch quickly with PumpFun (1% tax)"}
                      {selectedPlatform === "raydium" && "Create instant liquidity on Raydium DEX"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {walletConnected ? (
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 h-10"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
                </Button>
              ) : (
                <Button
                  onClick={connectWallet}
                  className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white h-10"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-6">
            {launchSuccess && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Token launched successfully!</span>
                </div>
                <p className="text-sm text-slate-300 mt-2">Your token has been created and is now live on Solana.</p>
              </div>
            )}

            {launchError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Launch failed</span>
                </div>
                <p className="text-sm text-slate-300 mt-2">{launchError}</p>
              </div>
            )}

            <div className="flex justify-center">
              <div className="relative">
                <div
                  className={cn(
                    "relative border-2 border-dashed transition-all duration-200 rounded-full w-32 h-32",
                    "border-slate-600 hover:border-slate-500",
                  )}
                >
                  {tokenForm.imageUrl ? (
                    <>
                      <img
                        src={tokenForm.imageUrl || "/placeholder.svg"}
                        alt="Token preview"
                        className="w-full h-full object-cover rounded-full"
                      />
                      <button
                        type="button"
                        onClick={() => setTokenForm({ ...tokenForm, imageUrl: "" })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            try {
                              const formData = new FormData()
                              formData.append("file", file)
                              const response = await fetch("/api/upload", {
                                method: "POST",
                                body: formData,
                              })
                              if (!response.ok) throw new Error("Upload failed")
                              const { url } = await response.json()
                              setTokenForm({ ...tokenForm, imageUrl: url })
                            } catch (error) {
                              console.error("Image upload failed:", error)
                            }
                          }
                        }}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Upload className="h-8 w-8 mb-2" />
                        <p className="text-xs text-center px-4">Upload Image</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Token Name */}
              <div className="space-y-2">
                <Label htmlFor="token-name" className="text-slate-300 flex items-center gap-2">
                  Token Name
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">The full name of your token (e.g., "AiFi Token")</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="token-name"
                  value={tokenForm.name}
                  onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
                  placeholder="e.g., AiFi Token"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                />
              </div>

              {/* Token Symbol */}
              <div className="space-y-2">
                <Label htmlFor="token-symbol" className="text-slate-300 flex items-center gap-2">
                  Token Symbol
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">The ticker symbol for your token (e.g., "AIFI")</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="token-symbol"
                  value={tokenForm.symbol}
                  onChange={(e) => setTokenForm({ ...tokenForm, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., AIFI"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="token-description" className="text-slate-300 flex items-center gap-2">
                Description
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">A brief description of your token and its purpose</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Textarea
                id="token-description"
                value={tokenForm.description}
                onChange={(e) => setTokenForm({ ...tokenForm, description: e.target.value })}
                placeholder="Describe your token's purpose and utility..."
                className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500 min-h-[100px]"
              />
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">Social Links (Optional)</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Twitter */}
                <div className="space-y-2">
                  <Label htmlFor="token-twitter" className="text-slate-300">
                    Twitter
                  </Label>
                  <Input
                    id="token-twitter"
                    value={tokenForm.twitter}
                    onChange={(e) => setTokenForm({ ...tokenForm, twitter: e.target.value })}
                    placeholder="https://twitter.com/..."
                    className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                  />
                </div>

                {/* Telegram */}
                <div className="space-y-2">
                  <Label htmlFor="token-telegram" className="text-slate-300">
                    Telegram
                  </Label>
                  <Input
                    id="token-telegram"
                    value={tokenForm.telegram}
                    onChange={(e) => setTokenForm({ ...tokenForm, telegram: e.target.value })}
                    placeholder="https://t.me/..."
                    className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                  />
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="token-website" className="text-slate-300">
                    Website
                  </Label>
                  <Input
                    id="token-website"
                    value={tokenForm.website}
                    onChange={(e) => setTokenForm({ ...tokenForm, website: e.target.value })}
                    placeholder="https://..."
                    className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {selectedPlatform === "meteora" && (
              <div className="space-y-2">
                <Label htmlFor="initial-buy" className="text-slate-300 flex items-center gap-2">
                  Initial Buy Amount (SOL)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Amount of SOL to use for initial token purchase (minimum 0.1 SOL)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="initial-buy"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={tokenForm.initialBuyAmount}
                  onChange={(e) => setTokenForm({ ...tokenForm, initialBuyAmount: e.target.value })}
                  placeholder="0.1"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                />
              </div>
            )}

            {selectedPlatform === "pumpfun" && (
              <div className="space-y-2">
                <Label htmlFor="initial-buy-pumpfun" className="text-slate-300 flex items-center gap-2">
                  Initial Buy Amount (SOL)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Amount of SOL for dev buy (minimum 1 SOL recommended)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="initial-buy-pumpfun"
                  type="number"
                  step="0.1"
                  min="1"
                  value={tokenForm.initialBuyAmount}
                  onChange={(e) => setTokenForm({ ...tokenForm, initialBuyAmount: e.target.value })}
                  placeholder="1"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                />
              </div>
            )}

            {selectedPlatform === "raydium" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pool-tax-mobile" className="text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      Pool Tax
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-slate-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Pool fee tier (1-4%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span className="text-cyan-400 font-semibold">{tokenForm.poolTax}%</span>
                  </Label>
                  <Slider
                    id="pool-tax-mobile"
                    min={1}
                    max={4}
                    step={0.1}
                    value={[Number.parseFloat(tokenForm.poolTax)]}
                    onValueChange={(value) => setTokenForm({ ...tokenForm, poolTax: value[0].toString() })}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>1%</span>
                    <span>4%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-fee-mobile" className="text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      Dev Fee
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-slate-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Developer fee percentage (0-100%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span className="text-cyan-400 font-semibold">{tokenForm.devFeePercentage}%</span>
                  </Label>
                  <Slider
                    id="dev-fee-mobile"
                    min={0}
                    max={100}
                    step={1}
                    value={[Number.parseFloat(tokenForm.devFeePercentage)]}
                    onValueChange={(value) => setTokenForm({ ...tokenForm, devFeePercentage: value[0].toString() })}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="liquidity-amount-mobile" className="text-slate-300 flex items-center gap-2">
                    Liquidity Amount (SOL)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-slate-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Initial liquidity to add to the pool (minimum 0.1 SOL)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="liquidity-amount-mobile"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tokenForm.liquidityAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "" || Number.parseFloat(value) >= 0) {
                        setTokenForm({ ...tokenForm, liquidityAmount: value })
                      }
                    }}
                    placeholder="0.1"
                    className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-cyan-500"
                  />
                  <p className="text-xs text-slate-400">0.1 minimum liquidity</p>
                </div>
              </div>
            )}

            {/* Launch Button */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={
                  selectedPlatform === "meteora"
                    ? handleTokenLaunch
                    : selectedPlatform === "pumpfun"
                      ? handlePumpFunLaunch
                      : handleRaydiumLaunch
                }
                disabled={
                  !walletConnected ||
                  isLaunchingToken ||
                  !tokenForm.name ||
                  !tokenForm.symbol ||
                  !tokenForm.description ||
                  !tokenForm.imageUrl ||
                  (selectedPlatform === "raydium" &&
                    (!tokenForm.liquidityAmount || Number.parseFloat(tokenForm.liquidityAmount) < 0.1)) // Added liquidity amount check to disable launch button
                }
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLaunchingToken ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Launching Token...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Launch on{" "}
                    {selectedPlatform === "meteora"
                      ? "Meteora"
                      : selectedPlatform === "pumpfun"
                        ? "PumpFun"
                        : "Raydium"}
                  </>
                )}
              </Button>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-cyan-400 mb-1">Cost Breakdown</p>
                  {selectedPlatform === "meteora" && <p>0.05 SOL for token creation + initial buy amount</p>}
                  {selectedPlatform === "pumpfun" && <p>~0.02 SOL for token creation + initial buy amount (1% tax)</p>}
                  {selectedPlatform === "raydium" && <p>Funding amount varies + liquidity pool creation (1-4% tax)</p>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderAIStudio = () => (
    <div className="grid gap-6">
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-100 flex items-center">
                <Brain className="mr-2 h-5 w-5 text-purple-500" />
                Create Your AI Agent
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Build a custom AI agent with advanced capabilities and personalized behavior
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {walletConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWallet}
                  className="border-slate-600 text-white bg-transparent hover:bg-slate-700/50" // Made text white
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                </Button>
              ) : (
                <Button
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white" // Made text white
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-purple-400">1</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-name" className="text-slate-300">
                    AI Name
                  </Label>
                  <Input
                    id="ai-name"
                    placeholder="Enter your AI's name"
                    value={aiForm.name}
                    onChange={(e) => setAiForm({ ...aiForm, name: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-description" className="text-slate-300">
                    Description
                  </Label>
                  <Input
                    id="ai-description"
                    placeholder="Brief description of your AI"
                    value={aiForm.description}
                    onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })}
                    maxLength={200}
                    className="bg-slate-800/50 border-slate-600 text-slate-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">{aiForm.description.length}/200 characters</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-prompt" className="text-slate-300">
                    System Prompt
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleEnhancePrompt}
                    disabled={!aiForm.prompt || aiForm.prompt.trim().length === 0 || isEnhancingPrompt}
                    className="h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {isEnhancingPrompt ? "Enhancing..." : "Enhance with AI"}
                  </Button>
                </div>
                <Textarea
                  id="ai-prompt"
                  placeholder="Define your AI's personality, behavior, and capabilities..."
                  value={aiForm.prompt}
                  onChange={(e) => setAiForm({ ...aiForm, prompt: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-slate-100 min-h-[120px]"
                />
                <p className="text-xs text-slate-500">
                  This prompt defines how your AI will behave and respond to users
                </p>
              </div>
            </div>

            {/* AI Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-cyan-400">2</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-200">AI Configuration</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Model Selection</Label>
                    <Select value={aiForm.model} onValueChange={(value) => setAiForm({ ...aiForm, model: value })}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="claude-sonnet-4-5-20250929" className="text-white">
                          Claude Sonnet 4.5 (Creative)
                        </SelectItem>
                        <SelectItem value="gpt-4" className="text-white">
                          GPT-4 (Advanced)
                        </SelectItem>
                        <SelectItem value="gemini-2.5-flash" className="text-white">
                          Gemini 2.5 Flash (Fast)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Public AI</Label>
                    <Switch
                      checked={aiForm.isPublic}
                      onCheckedChange={(checked) => setAiForm({ ...aiForm, isPublic: checked })}
                    />
                  </div>
                  <p className="text-xs text-slate-500">Allow others to discover and use your AI</p>
                </div>
              </div>
            </div>

            {/* Tools & Capabilities */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-400">3</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Tools & Capabilities</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">Web Search</div>
                        <div className="text-xs text-slate-500">Access real-time information</div>
                      </div>
                    </div>
                    <Switch
                      checked={aiForm.tools.webSearch}
                      onCheckedChange={(checked) =>
                        setAiForm({ ...aiForm, tools: { ...aiForm.tools, webSearch: checked } })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-800/20 rounded-lg border border-slate-700/30 opacity-60">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-5 w-5 text-slate-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-400">Code Execution</div>
                        <div className="text-xs text-slate-600">Coming Soon</div>
                      </div>
                    </div>
                    <Switch checked={false} disabled={true} className="opacity-50" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-800/20 rounded-lg border border-slate-700/30 opacity-60">
                    <div className="flex items-center space-x-3">
                      <Sparkles className="h-5 w-5 text-slate-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-400">Image Generation</div>
                        <div className="text-xs text-slate-600">Coming Soon</div>
                      </div>
                    </div>
                    <Switch checked={false} disabled={true} className="opacity-50" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-800/20 rounded-lg border border-slate-700/30 opacity-60">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-5 w-5 text-slate-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-400">Data Analysis</div>
                        <div className="text-xs text-slate-600">Coming Soon</div>
                      </div>
                    </div>
                    <Switch checked={false} disabled={true} className="opacity-50" />
                  </div>
                </div>
              </div>
            </div>

            {/* Knowledge Base */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-400">4</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Knowledge Base</h3>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  isDragOver ? "border-cyan-500 bg-cyan-500/10" : "border-slate-600 hover:border-slate-500"
                }`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <div className="text-sm text-slate-300 mb-1">
                  {isDragOver ? "Drop files here" : "Upload training documents"}
                </div>
                <div className="text-xs text-slate-500 mb-4">PDF, TXT, DOCX files up to 10MB each</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Files
                </Button>
              </div>

              {aiForm.knowledgeBase.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-slate-300 font-medium">
                    Uploaded Files ({aiForm.knowledgeBase.length})
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {aiForm.knowledgeBase.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-cyan-500" />
                          <div>
                            <div className="text-sm text-slate-200 truncate max-w-48">{file.name}</div>
                            <div className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-700/50">
              <Button
                variant="outline"
                onClick={() => navigateToView("home")} // Changed to navigate to home
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button onClick={handleCreateAI} className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white">
                <Rocket className="h-4 w-4 mr-2" />
                Deploy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderExplore = () => {
    const startIndex = explorePage * AGENTS_PER_PAGE
    const endIndex = startIndex + AGENTS_PER_PAGE
    const paginatedAgents = exploreAgents.slice(startIndex, endIndex)
    const paginatedTokens = exploreTokens.slice(startIndex, endIndex)
    const totalPages =
      exploreView === "agents"
        ? Math.ceil(exploreAgents.length / AGENTS_PER_PAGE)
        : Math.ceil(exploreTokens.length / AGENTS_PER_PAGE)

    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">
                  {exploreView === "agents" ? "Explore AI Agents" : "Explore Tokens"}
                </CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  {exploreView === "agents"
                    ? "Discover and interact with community AI agents"
                    : "Browse launched tokens with live market data"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ViewToggle
                value={exploreView}
                onValueChange={(value) => {
                  setExploreView(value as "agents" | "tokens")
                  setExplorePage(0)
                  if (value === "tokens" && exploreTokens.length === 0) {
                    fetchExploreTokens()
                  }
                }}
                options={[
                  { value: "agents", label: "Agents" },
                  { value: "tokens", label: "Tokens" },
                ]}
              />
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                {exploreView === "agents" ? `${exploreAgents.length} Agents` : `${exploreTokens.length} Tokens`}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {exploreView === "agents" ? (
            <>
              {exploreLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-slate-400">Loading AI agents...</div>
                </div>
              ) : exploreAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No public AI agents available yet.</p>
                  <p className="text-sm text-slate-500 mt-2">Be the first to create and share an AI agent!</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedAgents.map((agent) => (
                      <AIAgentCard
                        key={agent.id}
                        agent={agent}
                        onStartChat={(agentId) => {
                          const slug = createSlug(agent.name)
                          window.location.hash = `chat-${agent.id}`
                          setActiveView("chat")
                          fetchAIConfiguration(slug)
                          setChatMessages([])
                        }}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-slate-800">
                      <Button
                        onClick={() => setExplorePage(Math.max(0, explorePage - 1))}
                        disabled={explorePage === 0}
                        variant="outline"
                        size="sm"
                        className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-slate-400">
                        Page {explorePage + 1} of {totalPages}
                      </span>
                      <Button
                        onClick={() => setExplorePage(Math.min(totalPages - 1, explorePage + 1))}
                        disabled={explorePage === totalPages - 1}
                        variant="outline"
                        size="sm"
                        className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {exploreTokensLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-slate-400">Loading tokens...</div>
                </div>
              ) : exploreTokens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Coins className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No tokens launched yet.</p>
                  <p className="text-sm text-slate-500 mt-2">Be the first to launch a token!</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedTokens.map((token) => (
                      <TokenCard key={token.mint_address} token={token} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-slate-800">
                      <Button
                        onClick={() => setExplorePage(Math.max(0, explorePage - 1))}
                        disabled={explorePage === 0}
                        variant="outline"
                        size="sm"
                        className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-slate-400">
                        Page {explorePage + 1} of {totalPages}
                      </span>
                      <Button
                        onClick={() => setExplorePage(Math.min(totalPages - 1, explorePage + 1))}
                        disabled={explorePage === totalPages - 1}
                        variant="outline"
                        size="sm"
                        className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  const navigateToView = (view: "home" | "my-dashboard" | "create" | "launch" | "explore" | "docs" | "chat") => {
    setActiveView(view)
    window.location.hash = view
  }

  const renderMyDashboard = () => {
    if (!walletConnected) {
      return (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-24 min-h-[600px]">
            <div className="flex flex-col items-center justify-center text-center h-full">
              <Wallet className="h-16 w-16 text-slate-600 mb-4" />
              <h3 className="text-2xl font-semibold text-slate-300 mb-2">Connect Your Wallet</h3>
              <p className="text-slate-400 mb-6 max-md">Connect your wallet to view and manage your AI agents</p>
              <Button
                onClick={() => setShowWalletModal(true)}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Command className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">My AI Agents</CardTitle>
                <p className="text-sm text-slate-400 mt-1">Manage and monitor your created AI agents</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              {userAIConfigurations.length} {userAIConfigurations.length === 1 ? "Agent" : "Agents"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {userAIsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-400">Loading your AI agents...</div>
            </div>
          ) : userAIConfigurations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="h-12 w-12 text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No AI Agents Yet</h3>
              <p className="text-slate-400 mb-6 max-w-md">
                Create your first AI agent to get started. Build custom chatbots with unique personalities and
                capabilities.
              </p>
              <Button
                onClick={() => {
                  window.location.hash = "create" // Changed from "ai-studio" to "create"
                  setActiveView("create") // Changed from "ai-studio" to "create"
                }}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Create Your First AI
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userAIConfigurations.map((agent) => (
                <AIAgentCard
                  key={agent.id}
                  agent={agent}
                  onStartChat={(agentId) => {
                    const slug = createSlug(agent.name)
                    window.location.hash = `chat-${agent.id}`
                    setActiveView("chat")
                    fetchAIConfiguration(slug)
                    setChatMessages([])
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Initialize chart data fetching on mount
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await fetch(
          "https://api.dexscreener.com/latest/dex/search?q=AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn",
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          },
        )
        const data = await response.json()

        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0] // Get the first pair
          setTokenData({
            price: Number.parseFloat(pair.priceUsd) || 0,
            priceChange24h: Number.parseFloat(pair.priceChange?.h24) || 0,
            marketCap: Number.parseFloat(pair.marketCap) || 0,
            volume24h: Number.parseFloat(pair.volume?.h24) || 0,
            loading: false,
            error: null,
          })
        } else {
          setTokenData((prev) => ({ ...prev, loading: false, error: "No data found" }))
        }
      } catch (error) {
        console.error("Error fetching token data:", error)
        setTokenData((prev) => ({ ...prev, loading: false, error: "Failed to fetch data" }))
      }
    }

    fetchChartData()
    const interval = setInterval(fetchChartData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchLatestAgents = async () => {
    try {
      setLoadingLatestAgents(true)
      const response = await fetch("/api/ai-configurations/latest")
      const data = await response.json()
      setLatestAgents(data.configurations || [])
    } catch (error) {
      console.error("Error fetching latest agents:", error)
    } finally {
      setLoadingLatestAgents(false)
    }
  }

  useEffect(() => {
    if (activeView === "home") {
      fetchLatestAgents()
      const interval = setInterval(() => {
        fetchLatestAgents()
      }, 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [activeView])

  const fetchData = async () => {
    try {
      // Fetch token data from DexScreener
      const tokenResponse = await fetch(
        "https://api.dexscreener.com/latest/dex/search?q=AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn",
      )
      const tokenData = await tokenResponse.json()

      if (tokenData.pairs && tokenData.pairs.length > 0) {
        const pair = tokenData.pairs[0]
        setTokenData({
          price: Number.parseFloat(pair.priceUsd) || 0,
          priceChange24h: Number.parseFloat(pair.priceChange?.h24) || 0,
          marketCap: Number.parseFloat(pair.marketCap) || 0,
          volume24h: Number.parseFloat(pair.volume?.h24) || 0,
          loading: false,
          error: null,
        })
      } else {
        setTokenData((prev) => ({ ...prev, loading: false, error: "No data found" }))
      }
    } catch (error) {
      console.error("Error fetching token data:", error)
      setTokenData((prev) => ({ ...prev, loading: false, error: "Failed to fetch data" }))
    }
  }

  // START CHANGE: Add professional footer with logo, navigation columns, and social links
  const renderFooter = () => (
    <footer className="relative z-10 mt-16 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left side - Logo, Name, Description */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <img src="/genesis-logo.png" alt="AiFi" className="h-8 w-8" />
              <span className="text-xl font-bold text-white">AiFi</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Create custom AI agents, tokenize them, and earn revenue from every transaction. Launch in minutes with no
              coding required.
            </p>
          </div>

          {/* Platform Column */}
          <div>
            <h3 className="text-slate-200 font-semibold mb-4">Platform</h3>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => {
                    window.location.hash = "create"
                    setActiveView("create")
                  }}
                  className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                >
                  Create Agent
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    window.location.hash = "launch"
                    setActiveView("launch")
                  }}
                  className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                >
                  New Coin
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    window.location.hash = "my-dashboard"
                    setActiveView("my-dashboard")
                  }}
                  className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                >
                  Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Explore Column */}
          <div>
            <h3 className="text-slate-200 font-semibold mb-4">Explore</h3>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => {
                    window.location.hash = "explore"
                    setActiveView("explore")
                  }}
                  className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                >
                  Trending
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    window.location.hash = "explore"
                    setActiveView("explore")
                  }}
                  className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                >
                  AI Agents
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    window.location.hash = "explore"
                    setActiveView("explore")
                  }}
                  className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                >
                  Tokens
                </button>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="text-slate-200 font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => {
                    window.location.hash = "docs"
                    setActiveView("docs")
                  }}
                  className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                >
                  Documentation
                </button>
              </li>
              <li>
                <a
                  href="https://twitter.com/AiFi_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/AiFi_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                >
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section with social icons */}
        <div className="mt-12 pt-8 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-sm">© 2025 AiFi. All rights reserved.</p>
            <span className="text-slate-600 text-sm">•</span>
            <div className="flex items-center gap-2">
              <img src="/vision-coding-logo.png" alt="Vision Coding" className="h-4 w-4" />
              <a
                href="https://visioncoding.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
              >
                Built by Vision Coding
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://twitter.com/AiFi_app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-9 w-9 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors"
              aria-label="Twitter"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            <a
              href="https://t.me/AiFi_app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-9 w-9 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors"
              aria-label="Telegram"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )

  // Placeholder for renderChat function
  const renderChat = () => (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentChatAgent?.profile_picture_url || "/placeholder.svg"} />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg text-white">{currentChatAgent?.name || "Chat"}</CardTitle>
              <p className="text-xs text-slate-400">AI Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-400 bg-transparent">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {chatMessages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xl p-3 sm:p-4 rounded-lg ${
                message.role === "user"
                  ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
                  : "bg-slate-800/50 border border-slate-700/50"
              }`}
            >
              <p className="text-sm text-slate-300">{message.content}</p>
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-start items-center animate-pulse">
            <div className="p-3 sm:p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-cyan-500" />
                <div className="text-sm text-slate-400">Thinking...</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-slate-700/50 p-4 sm:p-6">
        <div className="relative w-full flex items-center">
          <Input
            type="text"
            placeholder="Send a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                sendChatMessage()
              }
            }}
            className="bg-slate-800/50 border-slate-700 focus:border-cyan-500 pr-12"
          />
          <Button
            size="icon"
            onClick={sendChatMessage}
            disabled={!chatInput.trim() || chatLoading}
            className="absolute right-2 h-8 w-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )

  // Placeholder for renderDocs function
  const renderDocs = () => (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-xl text-white">Documentation</CardTitle>
            <p className="text-sm text-slate-400 mt-1">Learn how to use AiFi platform</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="prose prose-invert max-w-none">
          <h1>Welcome to AiFi Documentation</h1>
          <p>
            AiFi is a revolutionary platform that allows you to create custom AI agents, tokenize them, and earn revenue
            from every transaction. This documentation will guide you through the features and functionalities of our
            platform.
          </p>

          <h2>Getting Started</h2>
          <p>
            Before you begin, make sure you have a Solana-compatible wallet (like Phantom or Solflare) installed and
            funded.
          </p>
          <ul>
            <li>
              <strong>Connect Wallet:</strong> Click the 'Connect Wallet' button in the header to link your wallet.
            </li>
            <li>
              <strong>Create AI Agent:</strong> Navigate to the 'AI Studio' section to build your own AI agent. Define
              its personality, capabilities, and knowledge base.
            </li>
            <li>
              <strong>Launch Token:</strong> Once your AI agent is ready, you can tokenize it. Go to the 'New Coin'
              section to launch your token, set its parameters, and provide initial liquidity.
            </li>
          </ul>

          <h2>Features</h2>
          <h3>AI Agent Creation</h3>
          <p>
            Our AI Studio provides a user-friendly interface to design and configure your AI agents. You can customize:
          </p>
          <ul>
            <li>
              <strong>Name & Description:</strong> Give your AI a unique identity.
            </li>
            <li>
              <strong>System Prompt:</strong> Define its behavior, persona, and instructions.
            </li>
            <li>
              <strong>Model Selection:</strong> Choose from various powerful AI models.
            </li>
            <li>
              <strong>Tools & Capabilities:</strong> Enable features like web search and more.
            </li>
            <li>
              <strong>Knowledge Base:</strong> Upload documents to train your AI on specific data.
            </li>
          </ul>

          <h3>Token Launch</h3>
          <p>Tokenizing your AI agent is straightforward. You can set up:</p>
          <ul>
            <li>
              <strong>Token Name & Symbol:</strong> The basic identifiers for your token.
            </li>
            <li>
              <strong>Description:</strong> Explain the utility and purpose of your token.
            </li>
            <li>
              <strong>Social Links:</strong> Connect your Twitter, Telegram, and website.
            </li>
            <li>
              <strong>Initial Buy Amount:</strong> Specify the SOL amount for the initial liquidity.
            </li>
          </ul>

          <h2>Advanced Topics</h2>
          <h3>Revenue Sharing</h3>
          <p>
            Earn revenue from every transaction involving your tokenized AI agent. The platform automatically handles
            fee distribution based on the parameters you set.
          </p>

          <h3>Community & Support</h3>
          <p>Join our community on Telegram and Twitter for updates, support, and discussions.</p>
          <ul>
            <li>
              <a href="https://t.me/AiFi_app" target="_blank" rel="noopener noreferrer">
                Telegram
              </a>
            </li>
            <li>
              <a href="https://twitter.com/AiFi_app" target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )

  // New: Define handleSearchResultClick
  const handleSearchResultClick = (agent: any) => {
    const slug = createSlug(agent.name)
    window.location.hash = `chat-${agent.id}`
    setActiveView("chat")
    fetchAIConfiguration(slug)
    setChatMessages([])
    setShowSearchDropdown(false) // Close the dropdown after clicking
  }

  // Effect to search agents when searchQuery changes
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([])
        setShowSearchDropdown(false)
        return
      }

      const query = searchQuery.toLowerCase()
      const filteredAgents = aiAgents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          (agent.description && agent.description.toLowerCase().includes(query)) ||
          agent.username?.toLowerCase().includes(query),
      )
      setSearchResults(filteredAgents)
      setShowSearchDropdown(filteredAgents.length > 0)
    }, 300) // Debounce search

    return () => {
      clearTimeout(handler)
    }
  }, [searchQuery, aiAgents])

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-black to-slate-900 text-slate-100 relative overflow-hidden">
      <div className="container mx-auto px-2 sm:px-4 max-w-full relative z-10">
        {/* Header */}
        <header className="flex flex-nowrap items-center justify-between py-3 sm:py-4 border-b border-slate-700/50 mb-4 sm:mb-6 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink">
            <div
              className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
              onClick={() => navigateToView("home")}
            >
              <img src="/genesis-logo.png" alt="Genesis AI" className="h-6 w-6 sm:h-8 sm:w-8" />
              <span className="text-lg sm:text-xl font-bold text-white">AiFi</span>
            </div>

            <div className="flex items-center space-x-1 bg-slate-800/50 rounded-full px-3 py-1.5 border border-slate-700/50 backdrop-blur-sm search-container relative z-[100]">
              <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm w-32 lg:w-40 placeholder:text-slate-500"
              />
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[101] overflow-hidden max-w-sm">
                  {searchResults.map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => handleSearchResultClick(agent)}
                      className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                          <Brain className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-200 truncate">{agent.name}</div>
                          <div className="text-xs text-slate-400 truncate">{agent.description || "No description"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="group hidden lg:inline-flex items-center gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 px-2 sm:px-3 py-2 rounded-md transition-colors focus-visible:outline-none text-sm">
                Platform
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 z-[9999]">
                <DropdownMenuItem
                  className="text-slate-300 hover:bg-slate-700/50 cursor-pointer transition-colors"
                  onClick={() => {
                    window.location.hash = "create"
                    setActiveView("create")
                  }}
                >
                  Create Agent
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-300 hover:bg-slate-700/50 cursor-pointer transition-colors"
                  onClick={() => {
                    window.location.hash = "launch"
                    setActiveView("launch")
                  }}
                >
                  New Token
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="group hidden lg:inline-flex items-center gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 px-2 sm:px-3 py-2 rounded-md transition-colors focus-visible:outline-none text-sm">
                Explore
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 z-[9999]">
                <DropdownMenuItem
                  className="text-slate-300 hover:bg-slate-700/50 cursor-pointer transition-colors"
                  onClick={() => {
                    window.location.hash = "explore"
                    setActiveView("explore")
                  }}
                >
                  AI Agents
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-300 hover:bg-slate-700/50 cursor-pointer transition-colors"
                  onClick={() => {
                    window.location.hash = "explore"
                    setActiveView("explore")
                  }}
                >
                  Tokens
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="group hidden lg:inline-flex items-center gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 px-2 sm:px-3 py-2 rounded-md transition-colors focus-visible:outline-none text-sm">
                Resources
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 z-[9999]">
                <DropdownMenuItem
                  className="text-slate-300 hover:bg-slate-700/50 cursor-pointer transition-colors"
                  onClick={() => {
                    window.location.hash = "docs"
                    setActiveView("docs")
                  }}
                >
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-300 hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <a
                    href="https://twitter.com/AiFi_app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center w-full"
                  >
                    Twitter
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <a
              href="https://twitter.com/AiFi_app"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center justify-center h-9 w-9 rounded-md text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            <a
              href="https://t.me/AiFi_app"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center justify-center h-9 w-9 rounded-md text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
              </svg>
            </a>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleNewAgent}
                    size="sm"
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white flex"
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">New Agent</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create a new AI agent</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {walletConnected && userProfile ? (
              <DropdownMenu open={showUserDropdown} onOpenChange={setShowUserDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarImage
                        src={userProfile.profile_picture_url || DEFAULT_PROFILE_PICTURE}
                        alt={userProfile.username}
                      />
                      <AvatarFallback className="bg-slate-700 text-cyan-500 text-xs sm:text-sm">
                        {userProfile.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50"
                  align="end"
                >
                  <div className="flex flex-col space-y-1 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-200 truncate">{userProfile.username}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-cyan-500 hover:bg-slate-800/50 flex-shrink-0"
                        onClick={() => {
                          setShowUserDropdown(false)
                          setIsEditingProfile(true)
                          setProfileForm({
                            username: userProfile?.username || "",
                            profilePicture: null,
                            profilePicturePreview: userProfile?.profile_picture_url || "",
                          })
                          setShowProfileSetup(true)
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="w-full truncate text-xs text-slate-400">{walletAddress}</p>
                  </div>
                  <DropdownMenuItem className="text-slate-300 hover:bg-slate-800/50">
                    <Eye className="mr-2 h-4 w-4" />
                    <span>View Creations</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-slate-300 hover:bg-slate-800/50" onClick={disconnectWallet}>
                    <Wallet className="mr-2 h-4 w-4" />
                    <span>Disconnect Wallet</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => {
                  setShowWalletModal(true)
                  setIsEditingProfile(false)
                }}
                className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-700 hover:bg-slate-600"
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-300" />
              </Button>
            )}
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-3 sm:gap-6">
          <div className="col-span-12 md:hidden mb-4">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <nav className="grid grid-cols-3 gap-2">
                  <NavItem
                    icon={Home}
                    label="Home"
                    active={activeView === "home"}
                    onClick={() => navigateToView("home")}
                  />
                  <NavItem
                    icon={Command}
                    label="Dashboard"
                    active={activeView === "my-dashboard"}
                    onClick={() => navigateToView("my-dashboard")}
                  />
                  <NavItem
                    icon={Brain}
                    label="AI Studio"
                    active={activeView === "create"}
                    onClick={() => navigateToView("create")}
                  />
                  <NavItem
                    icon={Plus}
                    label="New Coin"
                    active={activeView === "launch"}
                    onClick={() => navigateToView("launch")}
                  />
                  <NavItem
                    icon={Globe}
                    label="Explore"
                    active={activeView === "explore"}
                    onClick={() => navigateToView("explore")}
                  />
                  <NavItem
                    icon={FileText}
                    label="Docs"
                    active={activeView === "docs"}
                    onClick={() => navigateToView("docs")}
                  />
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Desktop only */}
          <div className="hidden md:block md:col-span-3 lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <NavItem
                    icon={Home}
                    label="Home"
                    active={activeView === "home"}
                    onClick={() => navigateToView("home")}
                  />
                  <NavItem
                    icon={Command}
                    label="Dashboard"
                    active={activeView === "my-dashboard"}
                    onClick={() => navigateToView("my-dashboard")}
                  />
                  <NavItem
                    icon={Brain}
                    label="AI Studio"
                    active={activeView === "create"}
                    onClick={() => navigateToView("create")}
                  />
                  <NavItem
                    icon={Plus}
                    label="New Coin"
                    active={activeView === "launch"}
                    onClick={() => navigateToView("launch")}
                  />
                  <NavItem
                    icon={Globe}
                    label="Explore"
                    active={activeView === "explore"}
                    onClick={() => navigateToView("explore")}
                  />
                  <NavItem
                    icon={FileText}
                    label="Docs"
                    active={activeView === "docs"}
                    onClick={() => navigateToView("docs")}
                  />
                </nav>

                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-2 font-mono">Powered by $AIFI</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {activeView === "create" ? ( // Changed from "ai-studio" to "create"
            <div className="col-span-12 md:col-span-9 lg:col-span-10">{renderAIStudio()}</div>
          ) : activeView === "launch" ? (
            <div className="col-span-12 md:col-span-9 lg:col-span-10">{renderNewCoinSection()}</div>
          ) : activeView === "my-dashboard" ? (
            <div className="col-span-12 md:col-span-9 lg:col-span-10">{renderMyDashboard()}</div>
          ) : activeView === "explore" ? (
            <div className="col-span-12 md:col-span-9 lg:col-span-10">{renderExplore()}</div>
          ) : activeView === "chat" ? (
            <div className="col-span-12 md:col-span-9 lg:col-span-10">{renderChat()}</div>
          ) : activeView === "docs" ? (
            <div className="col-span-12 md:col-span-9 lg:col-span-10">{renderDocs()}</div>
          ) : (
            <>
              {/* Main home view */}
              <div className="col-span-12 md:col-span-9 lg:col-span-7 h-full">
                <div className="grid gap-4 sm:gap-6 h-full">
                  {/* Hero Section */}
                  <div className="mb-2 sm:mb-[-89px]">
                    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-black to-slate-900 border border-slate-700/50 p-6 sm:p-8 md:p-12">
                      {/* Background decoration */}
                      <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-tr from-blue-500/10 to-pink-500/10 rounded-full blur-3xl"></div>

                      {/* Content */}
                      <div className="relative z-10 max-w-3xl">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent text-balance">
                          <span className="block sm:inline">Create AI Agents.</span>{" "}
                          <span className="block sm:inline">Launch Coins.</span>{" "}
                          <span className="block sm:inline">Get Paid.</span>
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed text-pretty">
                          Build custom AI chatbots, tokenize them, and earn revenue from every transaction. Launch in
                          minutes. No coding required.
                        </p>
                        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <Button
                            onClick={() => navigateToView("create")}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold rounded-lg shadow-lg shadow-cyan-500/25 w-full sm:w-auto"
                          >
                            <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Create Your AI Agent
                          </Button>
                          <Button
                            onClick={() => navigateToView("explore")}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold rounded-lg w-full sm:w-auto"
                          >
                            <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Explore Agents
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live AiFi Stats */}
                  <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden flex flex-col flex-1 min-h-[650px]">
                    <CardHeader className="border-b border-slate-700/50 pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-slate-100 text-xl flex items-center">
                          <Activity className="mr-2 h-5 w-5 text-cyan-500" />
                          Live AiFi Stats
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400"
                          onClick={refreshAllData}
                          disabled={isRefreshing}
                        >
                          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <TokenMetricCard
                          title="Token Price"
                          value={tokenData.loading ? "Loading..." : formatPrice(tokenData.price)}
                          icon={Zap}
                          trend={tokenData.priceChange24h > 0 ? "up" : tokenData.priceChange24h < 0 ? "down" : "stable"}
                          color="cyan"
                          detail={
                            tokenData.loading
                              ? "Fetching data..."
                              : `${tokenData.priceChange24h > 0 ? "+" : ""}${tokenData.priceChange24h.toFixed(2)}% (24h)`
                          }
                          loading={tokenData.loading}
                          error={tokenData.error}
                        />
                        <TokenMetricCard
                          title="Market Cap"
                          value={tokenData.loading ? "Loading..." : formatMarketCap(tokenData.marketCap)}
                          icon={BarChart3}
                          trend="stable"
                          color="purple"
                          detail={tokenData.loading ? "Fetching data..." : "Total Market Value"}
                          loading={tokenData.loading}
                          error={tokenData.error}
                        />
                        <TokenMetricCard
                          title="Volume (24h)"
                          value={tokenData.loading ? "Loading..." : formatVolume(tokenData.volume24h)}
                          icon={Activity}
                          trend="stable"
                          color="blue"
                          detail={tokenData.loading ? "Fetching data..." : "Trading Volume"}
                          loading={tokenData.loading}
                          error={tokenData.error}
                        />
                      </div>

                      <div className="mt-8 flex-1 flex flex-col">
                        <Tabs defaultValue="chart" className="w-full flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-4">
                            <TabsList className="bg-slate-800/50 p-1">
                              <TabsTrigger
                                value="chart"
                                className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                              >
                                Chart
                              </TabsTrigger>
                              <TabsTrigger
                                value="rewards"
                                className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                              >
                                Rewards
                              </TabsTrigger>
                              {/* Changed processes to distributions and moved after rewards */}
                              <TabsTrigger
                                value="distributions"
                                className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                              >
                                Distributions
                              </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center space-x-2 text-xs text-slate-400"></div>
                          </div>

                          <TabsContent value="chart" className="mt-0 h-[400px] sm:h-auto sm:flex-1">
                            <div className="h-full w-full relative bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                              <iframe
                                src={`https://dexscreener.com/solana/AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn?embed=1&theme=dark&trades=0&info=0`}
                                className="w-full h-full border-0"
                                title="DexScreener Chart"
                                sandbox="allow-scripts allow-same-origin"
                              />
                              <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm rounded-md px-3 py-2 border border-slate-700/50">
                                <div className="text-xs text-slate-400">Live Chart</div>
                                <div className="text-lg font-mono text-cyan-400">DexScreener</div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="processes" className="mt-0">
                            <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                              <div className="grid grid-cols-12 text-xs text-slate-400 p-3 border-b border-slate-700/50 bg-slate-800/50">
                                <div className="col-span-1">PID</div>
                                <div className="col-span-4">Process</div>
                                <div className="col-span-2">User</div>
                                <div className="col-span-2">CPU</div>
                                <div className="col-span-2">Memory</div>
                                <div className="col-span-1">Status</div>
                              </div>

                              <div className="divide-y divide-slate-700/30">
                                <ProcessRow
                                  pid="1024"
                                  name="system_core.exe"
                                  user="SYSTEM"
                                  cpu={12.4}
                                  memory={345}
                                  status="running"
                                />
                                <ProcessRow
                                  pid="1842"
                                  name="nexus_service.exe"
                                  user="SYSTEM"
                                  cpu={8.7}
                                  memory={128}
                                  status="running"
                                />
                                <ProcessRow
                                  pid="2156"
                                  name="security_monitor.exe"
                                  user="ADMIN"
                                  cpu={5.2}
                                  memory={96}
                                  status="running"
                                />
                                <ProcessRow
                                  pid="3012"
                                  name="network_manager.exe"
                                  user="SYSTEM"
                                  cpu={3.8}
                                  memory={84}
                                  status="running"
                                />
                                <ProcessRow
                                  pid="4268"
                                  name="user_interface.exe"
                                  user="USER"
                                  cpu={15.3}
                                  memory={256}
                                  status="running"
                                />
                                <ProcessRow
                                  pid="5124"
                                  name="data_analyzer.exe"
                                  user="ADMIN"
                                  cpu={22.1}
                                  memory={512}
                                  status="running"
                                />
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="rewards" className="mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Total SOL Distributed */}
                              <div className="bg-slate-900/50 rounded-lg border border-cyan-500/30 p-4 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm text-slate-400">Total SOL Distributed</div>
                                  <Zap className="h-5 w-5 text-cyan-500" />
                                </div>
                                <div className="text-2xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent from-slate-100 to-slate-300">
                                  {rewardsData.loading ? (
                                    <div className="animate-pulse bg-slate-600 h-8 w-20 rounded"></div>
                                  ) : !rewardsData.hasData ? (
                                    "Coming Soon"
                                  ) : (
                                    `${rewardsData.totalSolDistributed.toFixed(4)} SOL`
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {rewardsData.loading
                                    ? "Loading..."
                                    : !rewardsData.hasData
                                      ? "Awaiting first distribution"
                                      : "Lifetime rewards distributed"}
                                </div>
                                <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-r opacity-20 blur-xl from-cyan-500 to-blue-500"></div>
                              </div>

                              {/* Total Distributions */}
                              <div className="bg-slate-900/50 rounded-lg border border-purple-500/30 p-4 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm text-slate-400">Total Distributions</div>
                                  <BarChart3 className="h-5 w-5 text-purple-500" />
                                </div>
                                <div className="text-2xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent from-slate-100 to-slate-300">
                                  {rewardsData.loading ? (
                                    <div className="animate-pulse bg-slate-600 h-8 w-16 rounded"></div>
                                  ) : !rewardsData.hasData ? (
                                    "Coming Soon"
                                  ) : (
                                    rewardsData.totalDistributions
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {rewardsData.loading
                                    ? "Loading..."
                                    : !rewardsData.hasData
                                      ? "Awaiting first distribution"
                                      : "Distribution events completed"}
                                </div>
                                <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-r opacity-20 blur-xl from-purple-500 to-pink-500"></div>
                              </div>

                              {/* Minimum Required */}
                              <div className="bg-slate-900/50 rounded-lg border border-blue-500/30 p-4 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm text-slate-400">Minimum Required</div>
                                  <Shield className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="text-2xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent from-slate-100 to-slate-300">
                                  {rewardsData.loading ? (
                                    <div className="animate-pulse bg-slate-600 h-8 w-24 rounded"></div>
                                  ) : !rewardsData.hasData ? (
                                    "Coming Soon"
                                  ) : (
                                    `${formatRewardsNumber(rewardsData.minimumRequired)} Tokens`
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {rewardsData.loading
                                    ? "Loading..."
                                    : !rewardsData.hasData
                                      ? "Awaiting first distribution"
                                      : "Required for rewards eligibility"}
                                </div>
                                <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-r opacity-20 blur-xl from-blue-500 to-indigo-500"></div>
                              </div>

                              {/* Next Distribution */}
                              <div className="bg-slate-900/50 rounded-lg border border-green-500/30 p-4 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm text-slate-400">Next Distribution</div>
                                  <Activity className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="text-2xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent from-slate-100 to-slate-300">
                                  {(() => {
                                    if (
                                      distributionsData.loading ||
                                      distributionsData.error ||
                                      distributionsData.distributions.length === 0
                                    ) {
                                      return "Coming Soon"
                                    }

                                    const now = new Date()
                                    const distributions = distributionsData.distributions

                                    // Calculate average interval between distributions
                                    let totalInterval = 0
                                    let intervalCount = 0

                                    for (let i = 0; i < Math.min(distributions.length - 1, 5); i++) {
                                      const current = new Date(distributions[i].dateTime.replace(" ", "T") + "Z")
                                      const next = new Date(distributions[i + 1].dateTime.replace(" ", "T") + "Z")
                                      totalInterval += current.getTime() - next.getTime()
                                      intervalCount++
                                    }

                                    // Use average interval, or default to 1 hour if only one distribution
                                    const avgInterval =
                                      intervalCount > 0 ? totalInterval / intervalCount : 60 * 60 * 1000

                                    const lastDistribution = distributions[0]
                                    const lastDistTime = new Date(lastDistribution.dateTime.replace(" ", "T") + "Z")
                                    const nextDistribution = new Date(lastDistTime.getTime() + avgInterval)

                                    const diff = nextDistribution.getTime() - now.getTime()

                                    // If next distribution is in the past, show "Pending..."
                                    if (diff <= 0) {
                                      return "Pending..."
                                    }

                                    const hours = Math.floor(diff / (1000 * 60 * 60))
                                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                                    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                                    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
                                  })()}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {distributionsData.loading ||
                                  distributionsData.error ||
                                  distributionsData.distributions.length === 0
                                    ? "Awaiting first distribution"
                                    : "Time remaining"}
                                </div>
                                <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-r opacity-20 blur-xl from-green-500 to-emerald-500"></div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="distributions" className="mt-0">
                            <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                              <div className="grid grid-cols-12 text-xs text-slate-400 p-3 border-b border-slate-700/50 bg-slate-800/50">
                                <div className="col-span-4">Date/Time</div>
                                <div className="col-span-4">Amount Distributed</div>
                                <div className="col-span-4">Status</div>
                              </div>

                              <div className="divide-y divide-slate-700/30 max-h-64 overflow-y-auto">
                                {distributionsData.loading ? (
                                  <div className="p-4 text-center text-slate-400">
                                    <div className="animate-pulse">Loading distributions...</div>
                                  </div>
                                ) : distributionsData.error || distributionsData.distributions.length === 0 ? (
                                  <div className="p-8 text-center">
                                    <div className="text-2xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent from-slate-100 to-slate-300">
                                      Coming Soon
                                    </div>
                                    <div className="text-sm text-slate-400">Awaiting first distribution event</div>
                                  </div>
                                ) : (
                                  distributionsData.distributions.map((distribution) => {
                                    const { date, time } = formatDateTime(distribution.dateTime)
                                    return (
                                      <DistributionRow
                                        key={distribution.id}
                                        date={date}
                                        time={time}
                                        amount={distribution.amountDistributed}
                                        status={distribution.status}
                                      />
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security & Alerts */}
                </div>
              </div>

              {/* Right sidebar */}
              <div className="col-span-12 lg:col-span-3 h-full">
                <div className="grid gap-4 sm:gap-6">
                  <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                    <CardContent className="p-0">
                      {/* Token Image and Info */}
                      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 sm:p-6 border-b border-slate-700/50">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-cyan-400/30 shadow-lg shadow-cyan-500/20 flex-shrink-0">
                            <img
                              src="/images/design-mode/01%20%281%29.png"
                              alt="AiFi Token"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1">AiFi</h3>
                            <div className="text-base sm:text-lg font-mono text-cyan-400">$AIFI</div>
                          </div>
                        </div>
                      </div>

                      {/* Contract Address Section */}
                      <div className="p-3 sm:p-4">
                        <div className="bg-slate-800/50 rounded-md p-3 sm:p-4 border border-slate-700/50">
                          <div className="text-center">
                            <div className="text-xs text-slate-500 mb-2 font-mono">CONTRACT ADDRESS</div>
                            <div className="flex items-center justify-center gap-2">
                              <div className="text-sm sm:text-lg font-mono text-cyan-400 truncate">
                                {truncateAddress("AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn")}
                              </div>
                              <button
                                onClick={() => copyToClipboard("AifiNoHLBaqDdNQvaSYL8X6c2HqB5kZdZrMr3LxDSEsn")}
                                className="p-2 hover:bg-slate-700/50 rounded-md transition-colors flex-shrink-0"
                                title="Copy to clipboard"
                              >
                                {copied ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Newest AI Agents */}
                  <ScrollingAIAgents onAgentClick={handleAgentClick} />

                  {/* Overview Card */}
                  <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm block">
                    <CardHeader className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 sm:p-6 border-b border-slate-700/50">
                      <CardTitle className="text-slate-100 text-sm sm:text-base flex items-center">
                        <BarChart3 className="mr-2 h-4 w-4 text-cyan-500" />
                        Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4">
                      <div className="space-y-3 sm:space-y-4">
                        {/* Tokens Burned */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                              <Flame className="h-4 w-4 text-red-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-slate-400">Tokens Burned</div>
                              <div className="text-sm font-semibold text-slate-100 truncate">
                                {overviewData.loading
                                  ? "Loading..."
                                  : overviewData.error
                                    ? "Error"
                                    : `${(overviewData.tokensBurned / 1000000).toFixed(2)}M`}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Circulating Supply */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                              <Coins className="h-4 w-4 text-cyan-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-slate-400">Circulating Supply</div>
                              <div className="text-sm font-semibold text-slate-100 truncate">
                                {overviewData.loading
                                  ? "Loading..."
                                  : overviewData.error
                                    ? "Error"
                                    : `${(overviewData.circulatingSupply / 1000000).toFixed(2)}M`}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Rewards Distributed */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                              <Gift className="h-4 w-4 text-purple-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-slate-400">Rewards Distributed</div>
                              <div className="text-sm font-semibold text-slate-100 truncate">
                                {overviewData.loading
                                  ? "Loading..."
                                  : overviewData.error
                                    ? "Error"
                                    : `${overviewData.rewardsDistributed.toFixed(4)} SOL`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick actions */}
                  <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm block">
                    <CardHeader className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 sm:p-6 border-b border-slate-700/50">
                      <CardTitle className="text-slate-100 text-sm sm:text-base flex items-center">
                        <Zap className="mr-2 h-4 w-4 text-cyan-500" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4">
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <QuickActionButton icon={Sparkles} label="Create" onClick={() => navigateToView("create")} />
                        <QuickActionButton icon={Rocket} label="Launch" onClick={() => navigateToView("launch")} />
                        <QuickActionButton icon={Search} label="Explore" onClick={() => navigateToView("explore")} />
                        <QuickActionButton
                          icon={BarChart3}
                          label="Dashboard"
                          onClick={() => navigateToView("my-dashboard")}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="col-span-12 mt-8">
                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader className="border-b border-slate-700/50 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <Sparkles className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-white">
                            {exploreView === "agents" ? "Explore AI Agents" : "Explore Tokens"}
                          </CardTitle>
                          <p className="text-sm text-slate-400 mt-1">
                            {exploreView === "agents"
                              ? "Discover and interact with community AI agents"
                              : "Browse launched tokens with live market data"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <ViewToggle
                          value={exploreView}
                          onValueChange={(value) => {
                            setExploreView(value as "agents" | "tokens")
                            if (value === "tokens" && exploreTokens.length === 0) {
                              fetchExploreTokens()
                            }
                          }}
                          options={[
                            { value: "agents", label: "Agents" },
                            { value: "tokens", label: "Tokens" },
                          ]}
                        />
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                          {exploreView === "agents"
                            ? `${latestAgents.length} Agents`
                            : `${exploreTokens.length} Tokens`}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {exploreView === "agents" ? (
                      <>
                        {loadingLatestAgents ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                              <div
                                key={i}
                                className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 animate-pulse"
                              >
                                <div className="h-4 bg-slate-700 rounded w-3/4 mb-3"></div>
                                <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
                                <div className="h-3 bg-slate-700 rounded w-5/6"></div>
                              </div>
                            ))}
                          </div>
                        ) : latestAgents.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Brain className="h-12 w-12 text-slate-600 mb-4" />
                            <p className="text-slate-400">No public AI agents available yet.</p>
                            <p className="text-sm text-slate-500 mt-2">Be the first to create and share an AI agent!</p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                              {latestAgents.slice(0, 8).map((agent) => (
                                <AIAgentCard
                                  key={agent.id}
                                  agent={agent}
                                  onStartChat={(agentId) => {
                                    const slug = createSlug(agent.name)
                                    window.location.hash = `chat-${agent.id}`
                                    setActiveView("chat")
                                    fetchAIConfiguration(slug)
                                    setChatMessages([])
                                  }}
                                />
                              ))}
                            </div>
                            <div className="flex justify-center">
                              <Button
                                onClick={() => navigateToView("explore")}
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 hover:border-cyan-500/50 px-8 py-2"
                              >
                                View All Agents
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {exploreTokensLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="text-slate-400">Loading tokens...</div>
                          </div>
                        ) : exploreTokens.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Coins className="h-12 w-12 text-slate-600 mb-4" />
                            <p className="text-slate-400">No tokens launched yet.</p>
                            <p className="text-sm text-slate-500 mt-2">Be the first to launch a token!</p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                              {exploreTokens.slice(0, 6).map((token) => (
                                <TokenCard key={token.mint_address} token={token} />
                              ))}
                            </div>
                            <div className="flex justify-center">
                              <Button
                                onClick={() => navigateToView("explore")}
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 hover:border-cyan-500/50 px-8 py-2"
                              >
                                View All Tokens
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Home Hero Section */}
              <div className="col-span-12 lg:col-span-5 h-full hidden lg:block"></div>
            </>
          )}
        </div>
      </div>

      {/* Wallet Connection Modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Connect Your Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400 text-center">Choose a wallet to connect to AiFi</p>
            <div className="grid gap-3">
              {availableWallets.map((wallet) => (
                <Button
                  key={wallet.name}
                  variant="outline"
                  className={`flex items-center justify-between p-4 h-auto border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 ${
                    wallet.readyState === "Installed" ? "text-slate-100" : "text-slate-400 opacity-60"
                  }`}
                  onClick={() =>
                    wallet.readyState === "Installed" ? connectToWallet(wallet.name) : window.open(wallet.url, "_blank")
                  }
                  disabled={isConnecting}
                >
                  <div className="flex items-center space-x-3">
                    {wallet.name === "Phantom" || wallet.name === "Solflare" ? (
                      <img src={wallet.icon || "/placeholder.svg"} alt={wallet.name} className="w-8 h-8 rounded-lg" />
                    ) : (
                      <span className="text-2xl">{wallet.icon}</span>
                    )}
                    <div className="text-left">
                      <div className="font-medium">{wallet.name}</div>
                      <div className="text-xs text-slate-500">
                        {wallet.readyState === "Installed" ? "Detected" : "Not Installed"}
                      </div>
                    </div>
                  </div>
                  {wallet.readyState === "Installed" && (
                    <div className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Ready</div>
                  )}
                </Button>
              ))}
            </div>
            {isConnecting && <div className="text-center text-sm text-slate-400">Connecting to wallet...</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Setup Modal */}
      <Dialog open={showProfileSetup} onOpenChange={setShowProfileSetup}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              {isEditingProfile ? "Edit Your Profile" : "Complete Your Profile"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-slate-400 text-center">
              {isEditingProfile ? "Update your profile information" : "Set up your profile to get started with AiFi"}
            </p>

            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={
                      profileForm.profilePicturePreview ||
                      userProfile?.profile_picture_url ||
                      DEFAULT_PROFILE_PICTURE ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg"
                     || "/placeholder.svg"}
                    alt="Profile"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-slate-700 text-cyan-500 text-2xl">
                    {profileForm.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-slate-600 bg-slate-800 hover:bg-slate-700"
                  onClick={() => document.getElementById("profile-picture-input")?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  id="profile-picture-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                />
              </div>
              <p className="text-xs text-slate-500">Click the camera icon to upload a profile picture</p>
            </div>

            {/* Username Input */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">
                Username
              </Label>
              <Input
                id="username"
                value={profileForm.username}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, "")
                  setProfileForm((prev) => ({ ...prev, username: sanitized }))
                }}
                className="bg-slate-800/50 border-slate-600 text-slate-100"
                placeholder="Enter your username"
              />
              {isCheckingUsername && <p className="text-xs text-slate-400">Checking availability...</p>}
              {usernameError && <p className="text-xs text-red-400">{usernameError}</p>}
              {!isCheckingUsername && !usernameError && profileForm.username.length >= 3 && (
                <p className="text-xs text-green-400">Username available</p>
              )}
              {!usernameError && profileForm.username.length < 3 && profileForm.username.length > 0 && (
                <p className="text-xs text-slate-500">Username must be at least 3 characters</p>
              )}
              {!usernameError && profileForm.username.length === 0 && (
                <p className="text-xs text-slate-500">Only letters, numbers, and underscores allowed</p>
              )}
            </div>

            <Button
              onClick={handleProfileSetup}
              disabled={isCheckingUsername || !!usernameError || profileForm.username.length < 3}
              className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditingProfile ? "Complete" : "Sign Up"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {renderFooter()}
      {/* END CHANGE: Add professional footer with logo, navigation columns, and social links */}
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: LucideIcon | (() => React.ReactNode)
  label: string
  active?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start ${
        disabled
          ? "text-slate-600 cursor-not-allowed opacity-50"
          : active
            ? "bg-slate-800/70 text-cyan-400"
            : "text-slate-400 hover:text-slate-100"
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {typeof Icon === "function" ? <Icon /> : <Icon className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  )
}

// Component for status items
function StatusItem({ label, value, color }: { label: string; value: number; color: string }) {
  const getColor = () => {
    switch (color) {
      case "cyan":
        return "from-cyan-500 to-blue-500"
      case "green":
        return "from-green-500 to-emerald-500"
      case "blue":
        return "from-blue-500 to-indigo-500"
      case "purple":
        return "from-purple-500 to-pink-500"
      default:
        return "from-cyan-500 to-blue-500"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-xs text-slate-400">{value}%</div>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${getColor()} rounded-full`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  )
}

// Component for token metric cards
function TokenMetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  detail,
  loading,
  error,
}: {
  title: string
  value: string
  icon: LucideIcon
  trend: "up" | "down" | "stable"
  color: string
  detail: string
  loading?: boolean
  error?: string | null
}) {
  const getColor = () => {
    switch (color) {
      case "cyan":
        return "from-cyan-500 to-blue-500 border-cyan-500/30"
      case "green":
        return "from-green-500 to-emerald-500 border-green-500/30"
      case "blue":
        return "from-blue-500 to-indigo-500 border-blue-500/30"
      case "purple":
        return "from-purple-500 to-pink-500 border-purple-500/30"
      default:
        return "from-cyan-500 to-blue-500 border-cyan-500/30"
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <BarChart3 className="h-4 w-4 text-green-500" />
      case "down":
        return <BarChart3 className="h-4 w-4 rotate-180 text-red-500" />
      case "stable":
        return <LineChart className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  if (error) {
    return (
      <div className={`bg-slate-800/50 rounded-lg border ${getColor()} p-4 relative overflow-hidden`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-400">{title}</div>
          <Icon className={`h-5 w-5 text-${color}-500`} />
        </div>
        <div className="text-2xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent from-slate-100 to-slate-300">
          Coming soon...
        </div>
        <div className="text-xs text-slate-500">Token not launched</div>
      </div>
    )
  }

  return (
    <div className={`bg-slate-800/50 rounded-lg border ${getColor()} p-4 relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-400">{title}</div>
        <Icon className={`h-5 w-5 text-${color}-500`} />
      </div>
      <div className="text-2xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent from-slate-100 to-slate-300">
        {loading ? <div className="animate-pulse bg-slate-600 h-8 w-20 rounded"></div> : value}
      </div>
      <div className="text-xs text-slate-500">{detail}</div>
      <div className="absolute bottom-2 right-2 flex items-center">{getTrendIcon()}</div>
      <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-r opacity-20 blur-xl from-cyan-500 to-blue-500"></div>
    </div>
  )
}

// Process row component
function ProcessRow({
  pid,
  name,
  user,
  cpu,
  memory,
  status,
}: {
  pid: string
  name: string
  user: string
  cpu: number
  memory: number
  status: string
}) {
  return (
    <div className="grid grid-cols-12 py-2 px-3 text-sm hover:bg-slate-800/50">
      <div className="col-span-1 text-slate-500">{pid}</div>
      <div className="col-span-4 text-slate-300">{name}</div>
      <div className="col-span-2 text-slate-400">{user}</div>
      <div className="col-span-2 text-cyan-400">{cpu}%</div>
      <div className="col-span-2 text-purple-400">{memory} MB</div>
      <div className="col-span-1">
        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
          {status}
        </Badge>
      </div>
    </div>
  )
}

// Storage item component
function StorageItem({
  name,
  total,
  used,
  type,
}: {
  name: string
  total: number
  used: number
  type: string
}) {
  const percentage = Math.round((used / total) * 100)

  return (
    <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-300">{name}</div>
        <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600/50 text-xs">
          {type}
        </Badge>
      </div>
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-slate-500">
            {used} GB / {total} GB
          </div>
          <div className="text-xs text-slate-400">{percentage}%</div>
        </div>
        <Progress className="h-1.5 bg-slate-700">
          <div
            className={`h-full rounded-full ${
              percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-amber-500" : "bg-cyan-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </Progress>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="text-slate-500">Free: {total - used} GB</div>
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-slate-400 hover:text-slate-100">
          Details
        </Button>
      </div>
    </div>
  )
}

// Alert item component
function AlertItem({
  title,
  time,
  description,
  type,
}: {
  title: string
  time: string
  description: string
  type: "info" | "warning" | "error" | "success" | "update"
}) {
  const getTypeStyles = () => {
    if (title === "Token Creation Complete") {
      return { icon: Rocket, color: "text-green-500 bg-green-500/10 border-green-500/30" }
    }
    if (title === "Launch Completed") {
      return { icon: Rocket, color: "text-green-500 bg-green-500/10 border-green-500/30" }
    }

    switch (type) {
      case "success":
        return { icon: CheckCircle2, color: "text-green-500 bg-green-500/10 border-green-500/30" }
      case "info":
        return { icon: Info, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" }
      case "warning":
        return { icon: AlertCircle, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" }
      case "error":
        return { icon: AlertCircle, color: "text-red-500 bg-red-500/10 border-red-500/30" }
      case "update":
        return { icon: Sparkles, color: "text-purple-500 bg-purple-500/10 border-purple-500/30" }
      default:
        return { icon: Info, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" }
    }
  }
  const { icon: Icon, color } = getTypeStyles()

  return (
    <div className={`p-4 rounded-lg border flex items-center space-x-3 ${color}`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm truncate">{title}</div>
          <div className="text-xs text-slate-500 flex-shrink-0">{time}</div>
        </div>
        <div className="text-xs text-slate-300 mt-1 truncate">{description}</div>
      </div>
    </div>
  )
}

// Distribution row component
function DistributionRow({
  date,
  time,
  amount,
  status,
}: {
  date: string
  time: string
  amount: number
  status: string
}) {
  const getStatusBadge = () => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
            Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
            Pending
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-700/50 text-slate-400 border-slate-600/50">
            Unknown
          </Badge>
        )
    }
  }

  return (
    <div className="grid grid-cols-12 py-3 px-4 text-sm hover:bg-slate-800/50">
      <div className="col-span-4 flex items-center">
        <div className="flex flex-col">
          <span className="font-medium text-slate-200">{date}</span>
          <span className="text-xs text-slate-500">{time}</span>
        </div>
      </div>
      <div className="col-span-4 flex items-center text-slate-300 font-mono">{amount.toFixed(4)} SOL</div>
      <div className="col-span-4 flex items-center">{getStatusBadge()}</div>
    </div>
  )
}

// Quick action button component
function QuickActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      className="flex flex-col items-center justify-center space-y-1 h-20 sm:h-24 p-3 border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 group"
      onClick={onClick}
    >
      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
      <span className="text-xs sm:text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
        {label}
      </span>
    </Button>
  )
}

// AI Agent Card component
interface AIAgentCardProps {
  agent: any
  onStartChat: (agentId: number) => void
}

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

const AIAgentCard: React.FC<AIAgentCardProps> = ({ agent, onStartChat }) => {
  const agentSlug = agent.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 hover:bg-slate-800 hover:border-cyan-500/50 transition-all group cursor-pointer relative">
      <div className="absolute top-3 right-3 px-2 py-1 bg-slate-900/80 backdrop-blur-sm rounded text-xs text-slate-300 border border-slate-700/50">
        {getModelDisplayName(agent.ai_model || agent.model)}
      </div>

      <div className="flex items-start gap-3 mb-3">
        <div
          className={`h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-to-br ${getModelGradient(agent.ai_model || agent.model)} flex items-center justify-center`}
        >
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 pr-16">
          <h3 className="text-slate-100 font-semibold text-sm mb-1 truncate group-hover:text-cyan-400 transition-colors">
            {agent.name}
          </h3>
          <div className="text-xs text-slate-500">by {agent.username || truncateAddress(agent.wallet_address)}</div>
        </div>
      </div>
      <p className="text-slate-400 text-xs line-clamp-2 mb-3">
        {agent.description
          ? agent.description.length > 200
            ? agent.description.substring(0, 200) + "..."
            : agent.description
          : "No description provided"}
      </p>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{new Date(agent.created_at).toLocaleDateString()}</span>
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onStartChat(agent.id)
          }}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white h-8 px-3 text-xs"
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Start Chat
        </Button>
      </div>
    </div>
  )
}

// Token Card component
interface TokenCardProps {
  token: any
}

const formatNumber = (num: number | undefined) => {
  if (num === undefined || num === null || num === 0) return "—"
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
  if (num < 0.01) return `$${num.toFixed(6)}`
  return `$${num.toFixed(4)}`
}

const formatPercentage = (num: number | undefined) => {
  if (num === undefined || num === null) return "—"
  return `${num > 0 ? "+" : ""}${num.toFixed(2)}%`
}

const getTrendColor = (num: number | undefined) => {
  if (num === undefined || num === null) return "text-slate-400"
  if (num > 0) return "text-green-500"
  if (num < 0) return "text-red-500"
  return "text-slate-400"
}

const TokenCard: React.FC<TokenCardProps> = ({ token }) => {
  const handleClick = () => {
    if (token.mint_address) {
      window.open(`https://dexscreener.com/solana/${token.mint_address}`, "_blank")
    }
  }

  // For bonding curve tokens, price/volume/marketcap might not be available yet
  const price = token.price || token.priceUsd || 0
  const priceChange = token.priceChange24h || token.change24h || 0
  const volume = token.volume24h || token.volume || 0
  const marketCap = token.marketCap || token.market_cap || 0

  return (
    <div
      onClick={handleClick}
      className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-5 hover:bg-slate-800 hover:border-cyan-500/50 transition-all group cursor-pointer relative"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400/30 bg-slate-700/50 flex items-center justify-center">
          {token.image_url || token.imageUrl ? (
            <img
              src={token.image_url || token.imageUrl}
              alt={token.name || token.symbol}
              className="w-full h-full object-cover"
            />
          ) : (
            <Coins className="h-8 w-8 text-slate-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-100 truncate">{token.name || "Unknown Token"}</h3>
          <p className="text-sm text-slate-400">{token.symbol || "N/A"}</p>
        </div>
        <ExternalLink className="h-5 w-5 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Price</p>
          <p className="text-sm font-semibold text-slate-200">{formatNumber(price)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">24h Change</p>
          <p className={`text-sm font-semibold ${getTrendColor(priceChange)}`}>{formatPercentage(priceChange)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Volume 24h</p>
          <p className="text-sm font-semibold text-slate-200">{formatNumber(volume)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Market Cap</p>
          <p className="text-sm font-semibold text-slate-200">{formatNumber(marketCap)}</p>
        </div>
      </div>

      {token.platform && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <span
            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              token.platform === "meteora"
                ? "bg-cyan-500/20 text-cyan-400"
                : token.platform === "pumpfun"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-green-500/20 text-green-400"
            }`}
          >
            {token.platform.charAt(0).toUpperCase() + token.platform.slice(1)}
          </span>
        </div>
      )}
    </div>
  )
}
