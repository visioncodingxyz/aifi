"use client"

import { cn } from "@/lib/utils"

interface ViewToggleProps {
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}

export function ViewToggle({ value, onValueChange, options, className }: ViewToggleProps) {
  return (
    <div className={cn("inline-flex items-center rounded-lg bg-slate-800/50 p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onValueChange(option.value)}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
            value === option.value
              ? "bg-slate-700 text-cyan-400"
              : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
