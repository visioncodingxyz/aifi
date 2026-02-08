"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, AlertTriangle, Wallet, RefreshCw, ChevronDown, ChevronUp, Rocket } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  getSdk,
  prepareTokenCreation,
  finalizeTokenCreation,
  type TokenInfo,
  type FinalizeTokenParams,
} from "@/lib/revshare"
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import { saveTokenToDb, generateTokenDetailsWithAi } from "@/app/actions"
import { ImageUpload } from "@/components/image-upload"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

const createSingleTransferTx = async (
  connection: any,
  from: PublicKey,
  to: PublicKey,
  amountSol: number,
): Promise<Transaction> => {
  const { blockhash } = await connection.getLatestBlockhash()
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    }),
  )
  transaction.recentBlockhash = blockhash
  transaction.feePayer = from
  return transaction
}

export function TokenCreationForm() {
  const router = useRouter()
  const { connection } = useConnection()
  const wallet = useWallet()
  const { setVisible: setWalletModalVisible } = useWalletModal()

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [sdkError, setSdkError] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [sdkFundingAmount, setSdkFundingAmount] = useState<number | null>(null)
  const [isSocialLinksOpen, setIsSocialLinksOpen] = useState(false)
  const [isAdvancedConfigOpen, setIsAdvancedConfigOpen] = useState(false)

  // AI States
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [aiTopic, setAiTopic] = useState("")

  const PLATFORM_FEE_SOL = 0 // Temporarily set to 0 for free launches
  const PLATFORM_WALLET_ADDRESS = "45EqeyU2EcSX25kJSCaGQnEdTfwpTADG8h9LrHMcRDYz"
  const TYPICAL_SDK_FEE_SOL_ESTIMATE = 0.05
  const REFERRAL_WALLET_ADDRESS = "7ZzD9KvamFVwkHKbYW2vzriWEkTh2sFq7yAsiorogsDd"

  const [formData, setFormData] = useState<Omit<FinalizeTokenParams, "request_id">>({
    name: "",
    symbol: "",
    description: "",
    imageUrl: "",
    website: "",
    twitter: "",
    telegram: "",
    developerWallet: "",
    mode: 0,
    visible: 0,
    decimals: 9,
    taxTier: 6,
    initialBuy: "",
    dev_fee_percentage: 50,
    bondingCurveType: 1,
    reward_ca: "So11111111111111111111111111111111111111112",
    ref: REFERRAL_WALLET_ADDRESS,
  })

  const checkBalance = useCallback(async () => {
    if (!wallet.publicKey) return
    setIsLoadingBalance(true)
    setBalanceError(null)
    try {
      const balance = await connection.getBalance(wallet.publicKey)
      setWalletBalance(balance / LAMPORTS_PER_SOL)
    } catch (error: any) {
      setBalanceError(error.message || "Failed to fetch balance")
    } finally {
      setIsLoadingBalance(false)
    }
  }, [wallet.publicKey, connection])

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      checkBalance()
      setFormData((prev) => ({ ...prev, developerWallet: wallet.publicKey!.toBase58() }))
    } else {
      setWalletBalance(null)
      setFormData((prev) => ({ ...prev, developerWallet: "" }))
    }
  }, [wallet.connected, wallet.publicKey, checkBalance])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value === "" ? "" : Number(value) }))
  }

  const handleSelectChange = (name: keyof FinalizeTokenParams, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: Number(value) }))
  }

  const handleSliderChange = (name: keyof FinalizeTokenParams, value: number[]) => {
    setFormData((prev) => ({ ...prev, [name]: value[0] }))
  }

  const handleImageUploadChange = (url: string) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }))
  }

  const handleImageFileChange = async (file: File | null) => {
    if (!file) {
      setIsUploadingImage(false)
      return
    }
    setIsUploadingImage(true)
    toast.info("Uploading image...")
    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)
      const response = await fetch("/api/upload", { method: "POST", body: uploadFormData })
      if (!response.ok) throw new Error((await response.json()).error || "Upload failed")

      const { url } = await response.json()
      setFormData((prev) => ({ ...prev, imageUrl: url }))
      toast.success("Image uploaded successfully!")
    } catch (error: any) {
      toast.error(`Image upload failed: ${error.message}`)
      setFormData((prev) => ({ ...prev, imageUrl: "" }))
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleGenerateWithAi = async () => {
    setIsGeneratingAi(true)
    toast.info("🤖 Generating token details with AI...", {
      description: "This might take a moment. Please wait.",
    })
    try {
      const result = await generateTokenDetailsWithAi(aiTopic)

      if (result.error) {
        throw new Error(result.error)
      }

      setFormData((prev) => ({
        ...prev,
        name: result.name,
        symbol: result.ticker,
        description: result.description,
        imageUrl: result.imageUrl,
      }))
      toast.success("✨ AI generation complete!")
    } catch (error: any) {
      toast.error(`AI generation failed: ${error.message}`)
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const initialBuyAmount = typeof formData.initialBuy === "number" ? formData.initialBuy : 0
  const sdkBaseFee = sdkFundingAmount ?? TYPICAL_SDK_FEE_SOL_ESTIMATE
  const totalSdkFunding = sdkBaseFee + initialBuyAmount
  const totalRequiredSol = PLATFORM_FEE_SOL + totalSdkFunding
  const hasSufficientBalance = walletBalance !== null && walletBalance >= totalRequiredSol

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Token name is required"
    if (!formData.symbol.trim()) return "Token symbol is required"
    if (!formData.description.trim()) return "Token description is required"
    if (!formData.imageUrl.trim()) return "Token image is required"
    if (initialBuyAmount < 0) return "Initial buy amount cannot be negative"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    if (!wallet.publicKey || !wallet.sendTransaction) {
      toast.error("Please connect your wallet to launch the token.")
      setWalletModalVisible(true)
      return
    }

    if (!hasSufficientBalance) {
      toast.error(
        `Insufficient SOL. You need at least ${totalRequiredSol.toFixed(4)} SOL but have ${walletBalance?.toFixed(4) || 0} SOL.`,
      )
      return
    }

    setIsLoading(true)
    setSdkError(null)
    toast.info("Starting token launch process...")

    try {
      console.log("[v0] Starting token creation process")
      console.log("[v0] Initial buy amount:", initialBuyAmount, "SOL")

      const sdk = getSdk()

      console.log("[v0] Step 1: Preparing token creation...")
      const preparedData = await prepareTokenCreation(sdk)
      console.log("[v0] Prepared data:", preparedData)
      console.log("[v0] Funding wallet:", preparedData.funding_wallet)
      console.log("[v0] Base amount to fund:", preparedData.amount_to_fund, "SOL")

      setSdkFundingAmount(preparedData.amount_to_fund)

      const totalSdkFundingForTx = preparedData.amount_to_fund + initialBuyAmount
      console.log("[v0] Total funding amount (base + initial buy):", totalSdkFundingForTx, "SOL")
      console.log(
        "[v0] Breakdown: Base fee:",
        preparedData.amount_to_fund,
        "SOL + Initial buy:",
        initialBuyAmount,
        "SOL",
      )

      toast.success(
        `SDK prepared. Base fee: ${preparedData.amount_to_fund.toFixed(4)} SOL + Initial buy: ${initialBuyAmount.toFixed(4)} SOL = Total: ${totalSdkFundingForTx.toFixed(4)} SOL`,
      )

      if (PLATFORM_FEE_SOL > 0) {
        console.log("[v0] Step 2: Paying platform fee:", PLATFORM_FEE_SOL, "SOL")
        toast.info(`Please approve the platform fee: ${PLATFORM_FEE_SOL} SOL.`, {
          description: "This is the first of two transactions.",
        })
        const platformFeeTx = await createSingleTransferTx(
          connection,
          wallet.publicKey,
          new PublicKey(PLATFORM_WALLET_ADDRESS),
          PLATFORM_FEE_SOL,
        )
        const platformSignature = await wallet.sendTransaction(platformFeeTx, connection)
        console.log("[v0] Platform fee transaction signature:", platformSignature)
        toast.loading("Confirming platform fee transaction...", { id: platformSignature })
        await connection.confirmTransaction(platformSignature, "finalized")
        toast.success("Platform fee paid successfully!", { id: platformSignature })
      } else {
        console.log("[v0] Step 2: Platform fee waived (0 SOL)")
        toast.info("Platform fee is currently waived!")
      }

      console.log("[v0] Step 3: Funding distribution wallet...")
      console.log("[v0] Sending", totalSdkFundingForTx, "SOL to", preparedData.funding_wallet)
      toast.info(`Please approve funding the distribution wallet: ${totalSdkFundingForTx.toFixed(4)} SOL.`, {
        description: `Base fee (${preparedData.amount_to_fund.toFixed(4)} SOL) + Initial buy (${initialBuyAmount.toFixed(4)} SOL)`,
      })

      const sdkFundingTx = await createSingleTransferTx(
        connection,
        wallet.publicKey,
        new PublicKey(preparedData.funding_wallet),
        totalSdkFundingForTx,
      )
      const sdkSignature = await wallet.sendTransaction(sdkFundingTx, connection)
      console.log("[v0] Distribution wallet funding transaction signature:", sdkSignature)
      toast.loading("Confirming distribution wallet funding...", { id: sdkSignature })
      await connection.confirmTransaction(sdkSignature, "finalized")
      toast.success(`Distribution wallet funded with ${totalSdkFundingForTx.toFixed(4)} SOL!`, { id: sdkSignature })

      console.log("[v0] Step 4: Finalizing token creation...")
      toast.info("All payments confirmed. Finalizing token creation...")
      const { mint } = await finalizeTokenCreation(sdk, {
        request_id: preparedData.request_id,
        ...formData,
        initialBuy: initialBuyAmount,
        ref: REFERRAL_WALLET_ADDRESS,
      })
      console.log("[v0] Token created successfully! Mint:", mint)

      const newToken: TokenInfo = {
        mint,
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        imageUrl: formData.imageUrl,
        website: formData.website,
        twitter: formData.twitter,
        telegram: formData.telegram,
        developerWallet: formData.developerWallet,
        mode: formData.mode,
        visible: formData.visible,
        decimals: formData.decimals,
        taxTier: formData.taxTier,
        initialBuy: initialBuyAmount,
        dev_fee_percentage: formData.dev_fee_percentage,
        bondingCurveType: formData.bondingCurveType,
        supply: 0,
        creator: wallet.publicKey.toBase58(),
        metadata: {
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          image: formData.imageUrl,
        },
        distributionMode: "",
        bondingCurveActive: formData.bondingCurveType !== undefined,
        price: "0.0",
        change: "+0.00%",
        vol: "$0K",
        mcap: "$0M",
      }

      console.log("[v0] Step 5: Saving token to database...")
      await saveTokenToDb(newToken)
      toast.success("Token details saved to our database!")
      console.log("[v0] Token saved to database successfully")

      toast.success("Token created successfully! 🎉", {
        duration: 8000,
        description: `Your initial buy of ${initialBuyAmount.toFixed(4)} SOL should appear in your wallet shortly. Mint: ${mint}`,
        action: {
          label: "View on Explorer",
          onClick: () => window.open(`https://explorer.solana.com/address/${mint}`, "_blank"),
        },
      })

      console.log("[v0] Redirecting to token page on revshare.dev...")
      window.location.href = `https://revshare.dev/token/${mint}`
    } catch (error: any) {
      const errorMessage = error.message || "An unknown error occurred."
      console.error("[v0] Token creation failed:", errorMessage)
      console.error("[v0] Full error:", error)
      setSdkError(errorMessage)
      toast.error(`Token creation failed: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 bg-background text-foreground">
      {sdkError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Creation Error</AlertTitle>
          <AlertDescription>{sdkError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={isLoading || isGeneratingAi} className="space-y-6">
          <div className="flex justify-center">
            <ImageUpload
              variant="circular"
              value={formData.imageUrl}
              onChange={handleImageUploadChange}
              onFileChange={handleImageFileChange}
              required
            />
          </div>

          <div className="space-y-4 p-4 border border-dashed border-blue-500/50 rounded-lg">
            <div className="relative">
              <Input
                id="aiTopic"
                name="aiTopic"
                placeholder="Optional: Enter a topic for AI (e.g., 'DogeCoin')"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg h-12 px-4"
                disabled={isGeneratingAi}
              />
            </div>
            <Button
              type="button"
              onClick={handleGenerateWithAi}
              disabled={isGeneratingAi}
              className="w-full h-12 gradient-button text-white font-semibold"
            >
              {isGeneratingAi ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isGeneratingAi ? "Generating..." : "Generate with AI"}
            </Button>
          </div>

          <Input
            id="name"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg h-12 px-4"
          />

          <Input
            id="symbol"
            name="symbol"
            placeholder="Ticker"
            value={formData.symbol}
            onChange={handleChange}
            required
            className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg h-12 px-4"
          />

          <Textarea
            id="description"
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            required
            className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg min-h-[100px] px-4 py-3"
          />

          <div className="space-y-2">
            <p className="text-foreground">Initial Buy</p>
            <div className="relative">
              <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="initialBuy"
                name="initialBuy"
                type="number"
                min="0"
                step="0.001"
                placeholder="0.00"
                value={formData.initialBuy}
                onChange={handleNumberChange}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg h-12 pl-12 pr-16 no-spinners"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">SOL</span>
            </div>
          </div>

          <Collapsible open={isSocialLinksOpen} onOpenChange={setIsSocialLinksOpen} className="space-y-4">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-brand-blue hover:text-brand-blue/80 hover:bg-transparent px-0 dark:focus-visible:ring-0 dark:focus-visible:ring-offset-0 dark:focus:outline-none"
              >
                {isSocialLinksOpen ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                Social Links
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6">
              <div className="space-y-2">
                <Input
                  id="website"
                  name="website"
                  type="url"
                  placeholder="Website URL"
                  value={formData.website}
                  onChange={handleChange}
                  className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg h-12 px-4"
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="twitter"
                  name="twitter"
                  type="url"
                  placeholder="Twitter URL"
                  value={formData.twitter}
                  onChange={handleChange}
                  className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg h-12 px-4"
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="telegram"
                  name="telegram"
                  type="url"
                  placeholder="Telegram URL"
                  value={formData.telegram}
                  onChange={handleChange}
                  className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg h-12 px-4"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={isAdvancedConfigOpen} onOpenChange={setIsAdvancedConfigOpen} className="space-y-4">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-brand-blue hover:text-brand-blue/80 hover:bg-transparent px-0 dark:focus-visible:ring-0 dark:focus-visible:ring-offset-0 dark:focus:outline-none"
              >
                {isAdvancedConfigOpen ? (
                  <ChevronUp className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                Advanced Configuration
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-foreground text-sm">Rewards Configuration</p>
                <Select value={String(formData.mode)} onValueChange={(value) => handleSelectChange("mode", value)}>
                  <SelectTrigger className="w-full bg-input border-input text-foreground rounded-lg h-12 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Select Rewards Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-blue-500/20">
                    <SelectItem
                      value="0"
                      className="focus:bg-gradient-to-r focus:from-blue-400 focus:to-blue-600 focus:text-white hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-blue-600/20"
                    >
                      Rewards Token
                    </SelectItem>
                    <SelectItem
                      value="1"
                      className="focus:bg-gradient-to-r focus:from-blue-400 focus:to-blue-600 focus:text-white hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-blue-600/20"
                    >
                      Jackpot
                    </SelectItem>
                    <SelectItem
                      value="2"
                      className="focus:bg-gradient-to-r focus:from-blue-400 focus:to-blue-600 focus:text-white hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-blue-600/20"
                    >
                      Lottery
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Choose how rewards are distributed to token holders</p>
              </div>

              <div className="space-y-2">
                <p className="text-foreground text-sm">Tax Tier</p>
                <Select
                  value={String(formData.taxTier)}
                  onValueChange={(value) => handleSelectChange("taxTier", value)}
                >
                  <SelectTrigger className="w-full bg-input border-input text-foreground rounded-lg h-12 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Select Tax Tier" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-blue-500/20">
                    <SelectItem
                      value="6"
                      className="focus:bg-gradient-to-r focus:from-blue-400 focus:to-blue-600 focus:text-white hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-blue-600/20"
                    >
                      6% Tax
                    </SelectItem>
                    <SelectItem
                      value="10"
                      className="focus:bg-gradient-to-r focus:from-blue-400 focus:to-blue-600 focus:text-white hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-blue-600/20"
                    >
                      10% Tax
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-foreground text-sm">Reward Token Address (Default: SOL)</p>
                <Input
                  id="reward_ca"
                  name="reward_ca"
                  type="text"
                  placeholder="So11111111111111111111111111111111111111112 (SOL)"
                  value={formData.reward_ca}
                  onChange={handleChange}
                  className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg h-12 px-4"
                />
                <p className="text-xs text-muted-foreground">
                  Address of the token used for rewards (e.g., SOL mint address)
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-foreground text-sm">Developer Fee Percentage: {formData.dev_fee_percentage}%</p>
                <Slider
                  id="dev_fee_percentage"
                  name="dev_fee_percentage"
                  min={0}
                  max={100}
                  step={1}
                  value={[formData.dev_fee_percentage || 0]}
                  onValueChange={(value) => handleSliderChange("dev_fee_percentage", value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Percentage of total fees going to the developer (0-100)</p>
              </div>

              <div className="space-y-2">
                <p className="text-foreground text-sm">Bonding Curve Type</p>
                <Select
                  value={String(formData.bondingCurveType)}
                  onValueChange={(value) => handleSelectChange("bondingCurveType", value)}
                >
                  <SelectTrigger className="w-full bg-input border-input text-foreground rounded-lg h-12 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Select Bonding Curve Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-blue-500/20">
                    <SelectItem
                      value="1"
                      className="focus:bg-gradient-to-r focus:from-blue-400 focus:to-blue-600 focus:text-white hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-blue-600/20"
                    >
                      20 SOL threshold
                    </SelectItem>
                    <SelectItem
                      value="2"
                      className="focus:bg-gradient-to-r focus:from-blue-400 focus:to-blue-600 focus:text-white hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-blue-600/20"
                    >
                      60 SOL threshold
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Input
            id="developerWallet"
            name="developerWallet"
            value={formData.developerWallet}
            readOnly
            className="hidden"
          />
        </fieldset>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            Your Balance:{" "}
            {isLoadingBalance ? (
              <Loader2 className="h-3 w-3 inline-block animate-spin ml-1" />
            ) : (
              <span className="font-mono font-semibold text-foreground">
                {walletBalance?.toFixed(4) ?? "0.0000"} SOL
              </span>
            )}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={checkBalance}
            disabled={isLoadingBalance || !wallet.publicKey}
            className="h-6 w-6 text-muted-foreground hover:text-brand-blue"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {!hasSufficientBalance && walletBalance !== null && (
          <p className="text-destructive text-xs pt-1 font-semibold text-center">
            You have insufficient funds to complete this transaction.
          </p>
        )}

        <Button
          type="submit"
          disabled={isLoading || isUploadingImage || !wallet.publicKey || !hasSufficientBalance || isGeneratingAi}
          className="w-full gradient-button text-white font-semibold rounded-lg text-sm h-10 px-4"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
          {isLoading ? "Launching Token..." : "Launch Token"}
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Fees: {TYPICAL_SDK_FEE_SOL_ESTIMATE.toFixed(2)} SOL (Token Creation)
        </p>
      </form>
    </div>
  )
}
