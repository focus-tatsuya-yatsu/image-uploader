'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '@/lib/amplify-config'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { login, error, clearError, isAuthenticated } = useAuth()
  const router = useRouter()

  // 既にログイン済みの場合はメインページへ
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      return
    }

    setIsSubmitting(true)

    try {
      await login(email, password)
    } catch (err) {
      // エラーはAuthProviderで処理済み
      console.error('Login failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // エラーが変更されたらクリア（5秒後）
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '"Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          width: '100%',
          maxWidth: '450px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          animation: 'fadeIn 0.5s ease',
        }}
      >
        {/* ロゴ/タイトル */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '10px',
            }}
          >
            図面測定値転記システム
          </h1>
          <p
            style={{
              color: '#666',
              fontSize: '14px',
            }}
          >
            アカウントにログインしてください
          </p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div
            style={{
              background: '#fee',
              border: '1px solid #fcc',
              color: '#c00',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              animation: 'slideDown 0.3s ease',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* ログインフォーム */}
        <form onSubmit={handleSubmit}>
          {/* メールアドレス入力 */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#333',
                fontSize: '14px',
              }}
            >
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@company.com"
              required
              disabled={isSubmitting}
              autoComplete="email"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '2px solid #e0e0e0',
                fontSize: '16px',
                transition: 'all 0.2s',
                outline: 'none',
                boxSizing: 'border-box',
                background: isSubmitting ? '#f5f5f5' : 'white',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#667eea'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e0e0e0'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* パスワード入力 */}
          <div style={{ marginBottom: '10px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#333',
                fontSize: '14px',
              }}
            >
              パスワード
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isSubmitting}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 50px 12px 16px',
                  borderRadius: '10px',
                  border: '2px solid #e0e0e0',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: isSubmitting ? '#f5f5f5' : 'white',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#667eea'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e0e0e0'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              {/* パスワード表示/非表示ボタン */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#999',
                  fontSize: '20px',
                }}
                title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* パスワードを忘れた場合のリンク */}
          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <Link
              href="/forgot-password"
              style={{
                color: '#667eea',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              パスワードをお忘れですか？
            </Link>
          </div>

          {/* ログインボタン */}
          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            style={{
              width: '100%',
              padding: '14px',
              background:
                isSubmitting || !email || !password
                  ? 'linear-gradient(135deg, #999 0%, #777 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting || !email || !password ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow:
                isSubmitting || !email || !password
                  ? 'none'
                  : '0 4px 15px rgba(102, 126, 234, 0.4)',
              transform: 'translateY(0)',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && email && password) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            {isSubmitting ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                ></span>
                ログイン中...
              </span>
            ) : (
              'ログイン'
            )}
          </button>
        </form>

        {/* フッター */}
        <div
          style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #e0e0e0',
            textAlign: 'center',
            fontSize: '12px',
            color: '#999',
          }}
        >
          <p>© 2025 測定システム. All rights reserved.</p>
          <p style={{ marginTop: '5px' }}>ログインに問題がある場合は管理者にお問い合わせください</p>
          <p style={{ marginTop: '10px', color: '#666' }}>
            初回ログイン時は新しいパスワードの設定が必要です
          </p>
        </div>
      </div>

      {/* CSS アニメーション */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
