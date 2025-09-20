"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ColorPickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onColorChange?: (color: string) => void
}

export const ColorPicker = React.forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ className, onColorChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onColorChange) {
        onColorChange(e.target.value)
      }
    }

    return (
      <input
        type="color"
        className={cn(
          "h-10 w-10 cursor-pointer appearance-none overflow-hidden rounded-md border border-input bg-background p-0",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  },
)
ColorPicker.displayName = "ColorPicker"
