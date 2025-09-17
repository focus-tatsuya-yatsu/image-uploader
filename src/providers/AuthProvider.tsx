'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react'
import { signIn, signOut, getCurrentUser, fetchAuthSession, type AuthUser } from 'aws-amplify/auth'
import { useRouter, usePathname } from 'next/navigation'
import { Amplify } from 'aws-amplify'

// Amplify設定
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
  needPasswordChange: boolean
  currentAuthEmail: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [needPasswordChange, setNeedPasswordChange] = useState(false)
  const [currentAuthEmail, setCurrentAuthEmail] = useState<string | null>(null)
  const [skipRouteCheck, setSkipRouteCheck] = useState(false) // ルーティングチェックをスキップするフラグ
  const isPasswordChanging = useRef(false) // パスワード変更中フラグ

  const router = useRouter()
  const pathname = usePathname()

  // 認証状態の確認
  const checkAuthStatus = useCallback(async () => {
    try {
      const [currentUser, session] = await Promise.all([getCurrentUser(), fetchAuthSession()])

      if (currentUser && session.tokens?.idToken) {
        setUser(currentUser)
        setIsAuthenticated(true)
        console.log('User is authenticated')
        return true
      }
    } catch (error) {
      console.log('User is not authenticated')
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

        // パスワード変更直後かチェック
        const justChangedPassword = sessionStorage.getItem('passwordJustChanged')
        if (justChangedPassword === 'true') {
          console.log('Password was just changed, checking auth status...')
          sessionStorage.removeItem('passwordJustChanged')
          setSkipRouteCheck(true) // ルーティングチェックを一時的にスキップ

          // 少し待ってから認証状態を確認
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        await checkAuthStatus()
        setIsLoading(false)
        setIsInitialized(true)

        // スキップフラグを解除
        setTimeout(() => {
          setSkipRouteCheck(false)
        }, 2000)
      }
      initAuth()
    }
  }, [isInitialized, checkAuthStatus])

  // ルーティング制御
  useEffect(() => {
    // 初期化中、ローディング中、ルートチェックスキップ中、パスワード変更中はスキップ
    if (!isInitialized || isLoading || skipRouteCheck || isPasswordChanging.current) {
      return
    }

    // パスが /change-password の場合は特別な処理
    if (pathname === '/change-password' || pathname.startsWith('/change-password')) {
      // パスワード変更中フラグをセット
      isPasswordChanging.current = true
      return
    } else {
      // パスワード変更ページ以外に遷移したらフラグをリセット
      isPasswordChanging.current = false
    }

    // 公開ページの判定
    const isPublicRoute =
      pathname === '/login' ||
      pathname === '/forgot-password' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/forgot-password')

    // 公開ルートの場合は何もしない
    if (isPublicRoute) {
      return
    }

    // 認証が必要なページで未認証の場合のみリダイレクト
    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to login')
      router.push('/login')
    }
  }, [isAuthenticated, isInitialized, isLoading, pathname, router, skipRouteCheck])

  // ログイン処理
  const login = async (email: string, password: string) => {
    try {
      setError(null)
      console.log('Attempting to sign in...')

      const signInResult = await signIn({
        username: email,
        password,
      })

      console.log('Sign in result:', signInResult)

      // パスワード変更が必要な場合（初回ログイン時）
      if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        console.log('Initial password change required')
        setNeedPasswordChange(true)
        setCurrentAuthEmail(email)
        isPasswordChanging.current = true // パスワード変更中フラグをセット

        // セッションストレージに情報を保存
        sessionStorage.setItem('tempAuthEmail', email)
        sessionStorage.setItem('needPasswordChange', 'true')

        // パスワード変更画面へリダイレクト
        router.push('/change-password')
        return
      }

      // 通常のログイン成功
      if (signInResult.isSignedIn) {
        console.log('Sign in successful')

        // 少し待ってから認証状態を確認
        await new Promise((resolve) => setTimeout(resolve, 500))

        const authenticated = await checkAuthStatus()
        if (authenticated) {
          console.log('Authentication confirmed')
          setNeedPasswordChange(false)

          // セッションストレージをクリア
          sessionStorage.removeItem('tempAuthEmail')
          sessionStorage.removeItem('needPasswordChange')

          router.push('/')
        } else {
          throw new Error('認証状態の確認に失敗しました')
        }
      }
    } catch (err: any) {
      console.error('Login error:', err)

      let errorMessage = 'ログインに失敗しました'

      if (err.name === 'UserNotFoundException') {
        errorMessage = 'ユーザーが見つかりません'
      } else if (err.name === 'NotAuthorizedException') {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません'
      } else if (err.name === 'UserNotConfirmedException') {
        errorMessage = 'アカウントが確認されていません。管理者にお問い合わせください。'
      } else if (err.name === 'UserAlreadyAuthenticatedException') {
        // 既に認証済みの場合
        console.log('User already authenticated, checking status...')
        const isAuth = await checkAuthStatus()
        if (isAuth) {
          router.push('/')
          return
        }
      }

      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // ログアウト処理
  const logout = async () => {
    try {
      await signOut()

      // 状態をリセット
      setUser(null)
      setIsAuthenticated(false)
      setNeedPasswordChange(false)
      setCurrentAuthEmail(null)
      isPasswordChanging.current = false

      // セッションストレージをクリア
      sessionStorage.clear()

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
    needPasswordChange,
    currentAuthEmail,
  }

  // ローディング中の表示
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
        <div style={{ color: 'white', fontSize: '20px', textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid white',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          初期化中...
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
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
