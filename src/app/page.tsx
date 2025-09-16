'use client'

import { useAuth } from '@/providers/AuthProvider'
import MeasurementPage from '@/components/MeasurementPage'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // 認証チェック（修正版）
  useEffect(() => {
    // ローディング中は何もしない
    if (isLoading) return

    // 未認証の場合のみリダイレクト
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

  // 未認証（ローディング完了後）
  if (!isAuthenticated) {
    return null
  }

  // 認証済み
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '40px',
          right: '180px',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'white',
          padding: '8px 16px',
          borderRadius: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <span style={{ fontSize: '14px', color: '#666' }}>
          👤 {user?.signInDetails?.loginId || user?.username || 'ユーザー'}
        </span>
        <button
          onClick={logout}
          style={{
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          ログアウト
        </button>
      </div>

      <MeasurementPage />

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
