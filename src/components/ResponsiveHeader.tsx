'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

interface ResponsiveHeaderProps {
  user: any
  logout: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  historyCount: number
  onHistoryToggle: () => void
  isHistoryOpen: boolean
}

const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({
  user,
  logout,
  undo,
  redo,
  canUndo,
  canRedo,
  historyCount,
  onHistoryToggle,
  isHistoryOpen,
}) => {
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // 画面サイズの監視
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const headerButton = {
    padding: '6px 14px',
    borderRadius: '15px',
    border: '2px solid rgba(81, 108, 167, 0.99)',
    background: 'rgb(255, 255, 255)',
    backdropFilter: 'blur(10px)',
    color: 'black',
    cursor: 'pointer',
    fontWeight: '600',
    fontFamily: '"Noto Sans JP", sans-serif',
    fontSize: '13px',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  }

  const userBadge = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'white',
    padding: '8px 16px',
    borderRadius: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  }

  // デスクトップ版ヘッダー
  const DesktopHeader = () => (
    <>
      {/* ユーザー情報バッジ（右上固定） */}
      <div
        style={{
          background: 'linear-gradient(135deg, #DDDDDD 10%, #888888 100%)',
          color: 'white',
          position: 'relative', // 追加
        }}
      >
        {/* ユーザーバッジを右上に配置 */}
        <div
          style={{
            position: 'absolute',
            top: '32px',
            right: '20px',
            zIndex: 10,
            ...userBadge,
          }}
        >
          <span
            style={{
              fontSize: '14px',
              color: '#666',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
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
      </div>
      {/* 既存のヘッダーコンテンツ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      ></div>

      {/* メインヘッダー */}
      <div
        style={{
          background: 'linear-gradient(135deg, #DDDDDD 10%, #888888 100%)',
          color: 'white',
          padding: '15px 20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: '1600px',
            margin: '0 auto',
          }}
        >
          {/* 左側：Undo/Redoボタン */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              style={{
                ...headerButton,
                opacity: canUndo ? 1 : 0.5,
              }}
              onClick={undo}
              disabled={!canUndo}
              title="元に戻す (Ctrl+Z)"
            >
              ↶ 元に戻す
            </button>

            <button
              style={{
                ...headerButton,
                opacity: canRedo ? 1 : 0.5,
              }}
              onClick={redo}
              disabled={!canRedo}
              title="やり直す (Ctrl+Y)"
            >
              ↷ やり直す
            </button>

            <button style={headerButton} onClick={onHistoryToggle}>
              📜 履歴 ({historyCount})
            </button>
          </div>

          {/* 中央：タイトル */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '15px',
            }}
          >
            {/* ここにロゴを追加 */}
            <Image src="/logo.svg" alt="アプリケーションロゴ" width={75} height={62} />

            {/* タイトルとサブタイトルをdivでまとめる */}
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ margin: '0', fontSize: '24px' }}>図面測定値転記システム</h1>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                CalypsoとZEISS両形式のPDFに対応
              </p>
            </div>
          </div>
          {/* 右側：スペース確保 */}
          <div style={{ width: '300px' }}></div>
        </div>
      </div>
    </>
  )

  // モバイル版ヘッダー
  const MobileHeader = () => (
    <>
      {/* モバイル用ハンバーガーメニューボタン */}
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 10002,
          background: 'white',
          borderRadius: '50%',
          padding: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          cursor: 'pointer',
        }}
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
          }}
        >
          <span
            style={{ display: 'block', height: '2px', background: '#333', transition: 'all 0.3s' }}
          ></span>
          <span
            style={{ display: 'block', height: '2px', background: '#333', transition: 'all 0.3s' }}
          ></span>
          <span
            style={{ display: 'block', height: '2px', background: '#333', transition: 'all 0.3s' }}
          ></span>
        </div>
      </div>

      {/* モバイルメニュー */}
      {showMobileMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '280px',
            height: '100vh',
            background: 'white',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
            zIndex: 10001,
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          {/* 閉じるボタン */}
          <button
            onClick={() => setShowMobileMenu(false)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>

          {/* ユーザー情報 */}
          <div style={{ marginBottom: '30px', marginTop: '30px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
              👤 {user?.signInDetails?.loginId || user?.username || 'ユーザー'}
            </div>
            <button
              onClick={() => {
                logout()
                setShowMobileMenu(false)
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ログアウト
            </button>
          </div>

          {/* アクションボタン */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              style={{
                ...headerButton,
                width: '100%',
                opacity: canUndo ? 1 : 0.5,
              }}
              onClick={() => {
                undo()
                setShowMobileMenu(false)
              }}
              disabled={!canUndo}
            >
              ↶ 元に戻す
            </button>

            <button
              style={{
                ...headerButton,
                width: '100%',
                opacity: canRedo ? 1 : 0.5,
              }}
              onClick={() => {
                redo()
                setShowMobileMenu(false)
              }}
              disabled={!canRedo}
            >
              ↷ やり直す
            </button>

            <button
              style={{
                ...headerButton,
                width: '100%',
              }}
              onClick={() => {
                onHistoryToggle()
                setShowMobileMenu(false)
              }}
            >
              📜 履歴 ({historyCount})
            </button>
          </div>
        </div>
      )}

      {/* メインヘッダー（シンプル版） */}
      <div
        style={{
          background: 'linear-gradient(135deg, #DDDDDD 10%, #888888 100%)',
          color: 'white',
          padding: '12px 15px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: '0', fontSize: '18px' }}>図面測定値転記システム</h1>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px' }}>Calypso/ZEISS対応</p>
        </div>
      </div>
    </>
  )

  return isMobile ? <MobileHeader /> : <DesktopHeader />
}

export default ResponsiveHeader
