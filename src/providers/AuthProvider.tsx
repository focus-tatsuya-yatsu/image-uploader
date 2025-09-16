'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import {
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  confirmSignIn,
  type AuthUser,
} from 'aws-amplify/auth'
import { useRouter, usePathname } from 'next/navigation'
import { Amplify } from 'aws-amplify'

// Amplify設定（シンプル版）
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
    },
  },
})

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const router = useRouter()
  const pathname = usePathname()

  // 認証状態の確認
  const checkAuthStatus = useCallback(async () => {
    try {
      const [currentUser, session] = await Promise.all([getCurrentUser(), fetchAuthSession()])

      if (currentUser && session.tokens?.idToken) {
        setUser(currentUser)
        setIsAuthenticated(true)
        return true
      }
    } catch (error) {
      console.log('Not authenticated:', error)
    }

    setUser(null)
    setIsAuthenticated(false)
    return false
  }, [])

  // 初回マウント時のみ実行
  useEffect(() => {
    if (!isInitialized) {
      const initAuth = async () => {
        setIsLoading(true)
        await checkAuthStatus()
        setIsLoading(false)
        setIsInitialized(true)
      }
      initAuth()
    }
  }, [isInitialized, checkAuthStatus])

  // ルーティング制御（初期化完了後のみ）
  useEffect(() => {
    if (!isInitialized || isLoading) return

    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login')
    }
  }, [isAuthenticated, isInitialized, isLoading, pathname, router])

  // ログイン処理
  const login = async (email: string, password: string) => {
    try {
      setError(null)

      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
      })

      // パスワード変更が必要な場合
      if (nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        await confirmSignIn({ challengeResponse: password })
      }

      // 認証状態を更新
      const authenticated = await checkAuthStatus()
      if (authenticated) {
        router.push('/')
      } else {
        throw new Error('認証に失敗しました')
      }
    } catch (err: any) {
      console.error('Login error:', err)

      let errorMessage = 'ログインに失敗しました'
      if (err.name === 'UserNotFoundException') {
        errorMessage = 'ユーザーが見つかりません'
      } else if (err.name === 'NotAuthorizedException') {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません'
      }

      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // ログアウト処理
  const logout = async () => {
    try {
      await signOut()
      setUser(null)
      setIsAuthenticated(false)
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
      setError('ログアウトに失敗しました')
    }
  }

  const clearError = () => setError(null)

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    error,
    clearError,
  }

  // ローディング中は子要素をレンダリングしない
  if (!isInitialized) {
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
        <div style={{ color: 'white', fontSize: '20px' }}>初期化中...</div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
