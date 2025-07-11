'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToasterProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function Toaster({ position = 'top-right' }: ToasterProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  if (!mounted) return null

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  }

  return createPortal(
    <div
      className={`fixed z-50 flex flex-col gap-2 ${positionClasses[position]}`}
      role="alert"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg px-4 py-3 text-white shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
              ? 'bg-red-600'
              : 'bg-blue-600'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>,
    document.body
  )
}

// Global toast state management
let toastHandler: ((toast: Omit<Toast, 'id'>) => void) | null = null

export const setToastHandler = (handler: (toast: Omit<Toast, 'id'>) => void) => {
  toastHandler = handler
}

export const toast = {
  success: (message: string) => {
    toastHandler?.({ message, type: 'success' })
  },
  error: (message: string) => {
    toastHandler?.({ message, type: 'error' })
  },
  info: (message: string) => {
    toastHandler?.({ message, type: 'info' })
  },
} 