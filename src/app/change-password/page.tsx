'use client'

import { useState, useEffect } from 'react'
import { confirmSignIn, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    if (newPassword.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      return
    }

    // パスワードポリシーのチェック
    const hasUpperCase = /[A-Z]/.test(newPassword)
    const hasLowerCase = /[a-z]/.test(newPassword)
    const hasNumbers = /\d/.test(newPassword)
    const hasNonAlphas = /[^a-zA-Z\d]/.test(newPassword)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasNonAlphas) {
      setError('パスワードは大文字、小文字、数字、特殊文字を含む必要があります')
      return
    }

    setIsSubmitting(true)

    try {
      console.log('Confirming new password...')

      // 初回パスワードを変更
      const result = await confirmSignIn({ challengeResponse: newPassword })
      console.log('Password change result:', result)

      // パスワード変更成功
      if (result.isSignedIn) {
        console.log('Password changed successfully, user is signed in')

        // セッション情報をクリア
        sessionStorage.removeItem('tempAuthEmail')
        sessionStorage.removeItem('needPasswordChange')
        sessionStorage.removeItem('tempPassword')

        // 成功メッセージを表示
        alert('✅ パスワードが正常に設定されました！')

        // Next.jsのルーターの代わりにwindow.location.hrefを使用して強制的に遷移
        // これによりAuthProviderが再初期化される
        setTimeout(() => {
          window.location.href = '/'
        }, 500)
      } else {
        throw new Error('パスワード変更後の認証に失敗しました')
      }
    } catch (err: any) {
      console.error('Password change error:', err)

      // エラーメッセージの詳細化
      if (err.name === 'InvalidParameterException') {
        setError('パスワードがポリシーに準拠していません')
      } else if (err.name === 'NotAuthorizedException') {
        setError('セッションが無効です。ログイン画面から再度お試しください。')
        setTimeout(() => {
          window.location.href = '/login'
        }, 3000)
      } else if (err.message) {
        setError(err.message)
      } else {
        setError('パスワードの変更に失敗しました')
      }

      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '"Noto Sans JP", sans-serif',
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
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '10px',
            }}
          >
            初回パスワード設定
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            セキュリティのため、新しいパスワードを設定してください
          </p>
        </div>

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
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
              新しいパスワード
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新しいパスワードを入力"
                required
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '12px 50px 12px 16px',
                  borderRadius: '10px',
                  border: '2px solid #e0e0e0',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
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
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

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
              パスワードの確認
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力してください"
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '2px solid #e0e0e0',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              background: '#f0f8ff',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#555',
            }}
          >
            <p style={{ margin: '0 0 8px', fontWeight: 'bold' }}>パスワード要件:</p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>8文字以上</li>
              <li>大文字を含む (A-Z)</li>
              <li>小文字を含む (a-z)</li>
              <li>数字を含む (0-9)</li>
              <li>特殊文字を含む (!@#$% など)</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !newPassword || !confirmPassword}
            style={{
              width: '100%',
              padding: '14px',
              background:
                isSubmitting || !newPassword || !confirmPassword
                  ? 'linear-gradient(135deg, #999 0%, #777 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
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
                />
                パスワードを設定中...
              </span>
            ) : (
              'パスワードを設定'
            )}
          </button>
        </form>
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
