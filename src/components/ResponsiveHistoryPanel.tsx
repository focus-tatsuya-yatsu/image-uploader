import React, { useState, useEffect } from 'react'

interface HistoryEntry {
  id: string
  timestamp: string
  action: string
}

interface ResponsiveHistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  entries: HistoryEntry[]
  currentIndex: number
  maxEntries: number
  onRevert: (index: number) => void
}

const ResponsiveHistoryPanel: React.FC<ResponsiveHistoryPanelProps> = ({
  isOpen,
  onClose,
  entries,
  currentIndex,
  maxEntries,
  onRevert,
}) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  if (!isOpen) return null

  const panelStyles = {
    desktop: {
      position: 'fixed' as const,
      right: '10px',
      top: '70px', // ユーザーバッジの下に配置
      width: '280px',
      maxHeight: '70vh',
      background: 'white',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      zIndex: 1000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
      fontFamily: '"Noto Sans JP", sans-serif',
      animation: 'fadeInSlide 0.3s ease',
    },
    mobile: {
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '60vh',
      background: 'white',
      borderTopLeftRadius: '20px',
      borderTopRightRadius: '20px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
      zIndex: 1000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
      fontFamily: '"Noto Sans JP", sans-serif',
      animation: 'slideUp 0.3s ease',
    },
  }

  const currentStyle = isMobile ? panelStyles.mobile : panelStyles.desktop

  return (
    <>
      {/* モバイル用の背景オーバーレイ */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 999,
          }}
          onClick={onClose}
        />
      )}

      <div style={currentStyle}>
        {/* ヘッダー */}
        <div
          style={{
            padding: '15px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: isMobile ? '#f8f9fa' : 'transparent',
          }}
        >
          {isMobile && (
            <div
              style={{
                width: '40px',
                height: '4px',
                background: '#ccc',
                borderRadius: '2px',
                position: 'absolute',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />
          )}
          <h3 style={{ margin: 0, fontSize: '16px' }}>変更履歴</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* 履歴リスト */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px',
          }}
        >
          {entries.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center' }}>まだ履歴がありません</p>
          ) : (
            entries.map((entry, index) => (
              <div
                key={entry.id}
                style={{
                  padding: isMobile ? '10px 12px' : '8px 12px',
                  marginBottom: '5px',
                  background: index === currentIndex ? '#e3f2fd' : '#f5f5f5',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '14px' : '13px',
                  borderLeft: index === currentIndex ? '3px solid #667eea' : 'none',
                  transition: 'all 0.2s',
                }}
                onClick={() => onRevert(index)}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.background =
                      index === currentIndex ? '#e3f2fd' : '#ebebeb'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.background =
                      index === currentIndex ? '#e3f2fd' : '#f5f5f5'
                  }
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{entry.action}</div>
                <div style={{ fontSize: isMobile ? '12px' : '11px', color: '#666' }}>
                  {new Date(entry.timestamp).toLocaleTimeString('ja-JP')}
                </div>
              </div>
            ))
          )}
        </div>

        {/* フッター */}
        <div
          style={{
            padding: '10px',
            borderTop: '1px solid #e0e0e0',
            fontSize: '12px',
            color: '#666',
            background: isMobile ? '#f8f9fa' : 'transparent',
          }}
        >
          最大{maxEntries}件まで保存
        </div>
      </div>

      {/* CSS アニメーション */}
      <style jsx>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}

export default ResponsiveHistoryPanel
