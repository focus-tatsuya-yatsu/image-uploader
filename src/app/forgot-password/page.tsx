'use client'

import { useState } from 'react'
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'confirm'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // ステップ1: リセットコードをリクエスト
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await resetPassword({ username: email })
      setStep('confirm')
      alert(`確認コードを ${email} に送信しました`)
    } catch (err: any) {
      console.error('Reset request error:', err)
      if (err.name === 'UserNotFoundException') {
        setError('このメールアドレスは登録されていません')
      } else {
        setError('リセットコードの送信に失敗しました')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ステップ2: 新しいパスワードを設定
  const handleConfirmReset = async (e: React.FormEvent) => {
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
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword,
      })
      alert('パスワードが正常にリセットされました！')
      router.push('/login')
    } catch (err: any) {
      console.error('Reset confirmation error:', err)
      if (err.name === 'CodeMismatchException') {
        setError('確認コードが正しくありません')
      } else if (err.name === 'ExpiredCodeException') {
        setError('確認コードの有効期限が切れています')
      } else {
        setError('パスワードのリセットに失敗しました')
      }
    } finally {
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
            パスワードをリセット
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {step === 'request'
              ? '登録済みのメールアドレスを入力してください'
              : '確認コードと新しいパスワードを入力してください'}
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

        {step === 'request' ? (
          <form onSubmit={handleRequestReset}>
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

            <button
              type="submit"
              disabled={isSubmitting || !email}
              style={{
                width: '100%',
                padding: '14px',
                background:
                  isSubmitting || !email
                    ? 'linear-gradient(135deg, #999 0%, #777 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isSubmitting || !email ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                marginBottom: '15px',
              }}
            >
              {isSubmitting ? '送信中...' : '確認コードを送信'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset}>
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
                確認コード
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6桁のコードを入力"
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
                  letterSpacing: '2px',
                  textAlign: 'center',
                }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                メールに送信された6桁のコードを入力してください
              </small>
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

            <button
              type="submit"
              disabled={isSubmitting || !code || !newPassword || !confirmPassword}
              style={{
                width: '100%',
                padding: '14px',
                background:
                  isSubmitting || !code || !newPassword || !confirmPassword
                    ? 'linear-gradient(135deg, #999 0%, #777 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontSize: '16px',
                fontWeight: '600',
                cursor:
                  isSubmitting || !code || !newPassword || !confirmPassword
                    ? 'not-allowed'
                    : 'pointer',
                transition: 'all 0.3s',
                marginBottom: '15px',
              }}
            >
              {isSubmitting ? 'パスワードをリセット中...' : 'パスワードをリセット'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('request')
                setCode('')
                setNewPassword('')
                setConfirmPassword('')
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '25px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            >
              コードを再送信
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link
            href="/login"
            style={{
              color: '#667eea',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            ← ログイン画面に戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
