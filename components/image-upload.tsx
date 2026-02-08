"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  value?: string
  onChange?: (url: string) => void
  onFileChange?: (file: File | null) => void
  variant?: "square" | "circular"
  required?: boolean
  disabled?: boolean
}

export function ImageUpload({
  value,
  onChange,
  onFileChange,
  variant = "square",
  required = false,
  disabled = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | undefined>(value)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith("image/")) {
        handleFile(file)
      }
    },
    [disabled],
  )

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [])

  const handleFile = (file: File) => {
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Call the file change handler
    onFileChange?.(file)
  }

  const handleRemove = useCallback(() => {
    setPreview(undefined)
    onChange?.("")
    onFileChange?.(null)
  }, [onChange, onFileChange])

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative border-2 border-dashed transition-all duration-200",
          variant === "circular" ? "rounded-full w-32 h-32" : "rounded-lg w-full h-48",
          isDragging ? "border-cyan-500 bg-cyan-500/10" : "border-slate-600 hover:border-slate-500",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <>
            <img
              src={preview || "/placeholder.svg"}
              alt="Token preview"
              className={cn("w-full h-full object-cover", variant === "circular" ? "rounded-full" : "rounded-lg")}
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <label
            className={cn(
              "flex flex-col items-center justify-center w-full h-full cursor-pointer",
              disabled && "cursor-not-allowed",
            )}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              disabled={disabled}
              required={required}
            />
            <div className="flex flex-col items-center justify-center text-slate-400">
              {isDragging ? <Upload className="h-8 w-8 mb-2 text-cyan-500" /> : <ImageIcon className="h-8 w-8 mb-2" />}
              <p className="text-sm text-center px-4">{isDragging ? "Drop image here" : "Click or drag image"}</p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG, or SVG</p>
            </div>
          </label>
        )}
      </div>
    </div>
  )
}
