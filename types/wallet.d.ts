// Global window type declarations for Solana wallet adapters
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean
      connect: () => Promise<{ publicKey: { toString: () => string } }>
      disconnect: () => Promise<void>
      on: (event: string, callback: () => void) => void
      request: (method: string, params?: any) => Promise<any>
    }
    solflare?: {
      isConnected: boolean
      publicKey: { toString: () => string }
      connect: () => Promise<void>
      disconnect: () => Promise<void>
      signTransaction: (transaction: any) => Promise<any>
      signAllTransactions: (transactions: any[]) => Promise<any[]>
    }
  }
}

export {}
