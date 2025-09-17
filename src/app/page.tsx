'use client'

import { useAuth } from '@/providers/AuthProvider'
import MeasurementPage from '@/components/MeasurementPage'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)

  // 画面サイズの監視
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // 認証チェック
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // ローディング中の表示
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: '20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              border: '3px solid white',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          認証を確認中...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // ⭐ ログアウトボタンを削除して、MeasurementPageに任せる
  return (
    <>
      {/* ログアウトボタンは削除 */}
      <MeasurementPage user={user} logout={logout} isMobile={isMobile} />

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  )
}
