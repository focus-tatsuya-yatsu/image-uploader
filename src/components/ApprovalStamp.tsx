import React, { useState } from 'react'

interface ApprovalStampData {
  id: number
  x: number
  y: number
  width: number
  height: number
  type: 'approvalStamp'
  data: {
    title: string
    date: string
    orderNo: string
    companyName: string
    stamps: {
      approval: string | null
      confirmation: string | null
      creation: string | null
    }
  }
}

interface ApprovalStampProps {
  stamp: ApprovalStampData
  onUpdate: (stamp: ApprovalStampData) => void
  onDelete: (id: number) => void
  isDragging?: boolean
  textColorMode: 'black' | 'white'
}

// スケール計算関数を追加
const getScaleFactor = (width: number, height: number): number => {
  const baseWidth = 400
  const baseHeight = 330
  return Math.min(width / baseWidth, height / baseHeight, 1)
}

// 印鑑デザインのコンポーネント（修正版）
const StampMark: React.FC<{
  name: string | null
  onClick: () => void
  scale: number
}> = ({ name, onClick, scale }) => {
  // サイズをさらに小さく調整（最小15px、最大50px）
  const size = Math.min(50, Math.max(15, 50 * scale))

  if (!name) {
    return (
      <div
        onClick={onClick}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `${Math.max(1, 2 * scale)}px dashed #ccc`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: `${Math.max(6, 10 * scale)}px`,
          color: '#999',
        }}
      >
        {scale > 0.3 ? 'クリック' : '+'}
      </div>
    )
  }

  // 文字サイズもさらに調整
  const getFontSize = (text: string) => {
    const length = text.length
    let baseFontSize: number
    if (length <= 2) baseFontSize = 0.9
    else if (length === 3) baseFontSize = 0.6
    else if (length === 4) baseFontSize = 0.5
    else if (length === 5) baseFontSize = 0.4
    else baseFontSize = 0.35

    const scaledSize = baseFontSize * Math.max(0.5, scale)
    return `${Math.max(0.25, Math.min(1, scaledSize))}rem`
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: `${Math.max(1, 2 * scale)}px solid #ff0000`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.9)',
        fontFamily: '"游明朝", "Yu Mincho", serif',
        fontSize: getFontSize(name),
        color: '#ff0000',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {name}
    </div>
  )
}

export const ApprovalStamp: React.FC<ApprovalStampProps> = ({
  stamp,
  onUpdate,
  onDelete,
  isDragging,
}) => {
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [isEditingOrderNo, setIsEditingOrderNo] = useState(false)
  const [tempDate, setTempDate] = useState(stamp.data.date)
  const [tempOrderNo, setTempOrderNo] = useState(stamp.data.orderNo)

  // スケール計算
  const scale = getScaleFactor(stamp.width, stamp.height)

  // 最小サイズのチェック
  const isToSmall = stamp.width < 150 || stamp.height < 120

  const handleStampClick = (position: 'approval' | 'confirmation' | 'creation') => {
    const currentName = stamp.data.stamps[position]
    const newName = prompt(
      `${position === 'approval' ? '承認' : position === 'confirmation' ? '確認' : '作成'}者の名前を入力してください（姓のみ）`,
      currentName || ''
    )

    if (newName !== null) {
      onUpdate({
        ...stamp,
        data: {
          ...stamp.data,
          stamps: {
            ...stamp.data.stamps,
            [position]: newName || null,
          },
        },
      })
    }
  }

  // 日付をパース
  const dateParts = stamp.data.date.match(/(\d{4})[^\d]*(\d{1,2})[^\d]*(\d{1,2})/)
  const year = dateParts ? dateParts[1] : '____'
  const month = dateParts ? dateParts[2] : '__'
  const day = dateParts ? dateParts[3] : '__'

  // 非常に小さい場合は簡略表示
  if (isToSmall) {
    return (
      <div
        style={{
          width: `${stamp.width}px`,
          height: `${stamp.height}px`,
          border: '3px solid #ff0000',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          color: '#ff0000',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        承認印
        {/* 削除ボタン */}
        <button
          onClick={() => onDelete(stamp.id)}
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#ff0000',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            zIndex: 10,
          }}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        width: `${stamp.width}px`,
        height: `${stamp.height}px`,
        border: '3px solid #ff0000',
        background: 'white',
        fontFamily: '"游明朝", "Yu Mincho", serif',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        color: '#ff0000',
      }}
    >
      {/* 削除ボタン */}
      <button
        onClick={() => onDelete(stamp.id)}
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#ff0000',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          zIndex: 10,
        }}
      >
        ×
      </button>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        }}
      >
        {/* 1. タイトルと日付 - 動的高さ */}
        <div
          style={{
            borderBottom: '3px solid #ff0000',
            padding: `${Math.max(5, 10 * scale)}px ${Math.max(8, 15 * scale)}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: `0 0 ${Math.max(40, 80 * scale)}px`,
          }}
        >
          <div
            style={{
              fontSize: `${Math.max(12, 24 * scale)}px`,
              fontWeight: 'bold',
              letterSpacing: scale > 0.3 ? `${0.3 * scale}rem` : '0',
            }}
          >
            {scale > 0.3 ? stamp.data.title : '検査表'} {/* 小さい時は短縮 */}
          </div>

          {/* 日付を常に表示（サイズによってフォーマット変更） */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              fontSize: `${Math.max(7, 14 * scale)}px`, // 最小7pxまで
              whiteSpace: 'nowrap',
              marginTop: scale > 0.3 ? `${5 * scale}px` : '2px',
            }}
          >
            {isEditingDate ? (
              <input
                type="text"
                value={tempDate}
                placeholder="例: 2025/09/25"
                onChange={(e) => setTempDate(e.target.value)}
                onBlur={() => {
                  onUpdate({ ...stamp, data: { ...stamp.data, date: tempDate } })
                  setIsEditingDate(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdate({ ...stamp, data: { ...stamp.data, date: tempDate } })
                    setIsEditingDate(false)
                  }
                }}
                style={{
                  border: '1px solid #ff0000',
                  padding: '1px 3px',
                  fontSize: `${Math.max(7, 14 * scale)}px`,
                  fontFamily: 'inherit',
                  width: `${Math.max(80, 120 * scale)}px`,
                  color: '#ff0000',
                }}
                autoFocus
              />
            ) : (
              <span
                onClick={() => setIsEditingDate(true)}
                style={{
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  letterSpacing: scale > 0.3 ? `${2 * scale}px` : '0',
                }}
              >
                {/* スケールに応じて日付フォーマットを変更 */}
                {
                  scale > 0.4
                    ? `${year} 年 ${month} 月 ${day} 日` // 通常表示
                    : scale > 0.3
                      ? `${year}/${month}/${day}` // 中間サイズ
                      : `${month}/${day}` // 最小サイズ（月日のみ）
                }
              </span>
            )}
          </div>
        </div>

        {/* 2. 会社名 */}
        <div
          style={{
            padding: `${Math.max(6, 12 * scale)}px ${Math.max(4, 8 * scale)}px`,
            textAlign: 'center',
            fontSize: `${Math.max(7, 18 * scale)}px`,
            fontWeight: 'bold',
            borderBottom: '3px solid #ff0000',
            flex: `0 0 ${Math.max(25, 50 * scale)}px`,
            color: '#ff0000',
            letterSpacing: `${0.5 * scale}rem`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {stamp.data.companyName}
        </div>

        {/* 3. 承認欄 */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden', // オーバーフローを防ぐ
          }}
        >
          {['approval', 'confirmation', 'creation'].map((key) => (
            <div
              key={key}
              style={{
                flex: 1,
                borderRight: key !== 'creation' ? '2px solid #ff0000' : 'none',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0, // 最小幅を0に
                overflow: 'hidden', // オーバーフローを防ぐ
              }}
            >
              <div
                style={{
                  padding: `${Math.max(3, 8 * scale)}px`,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: `${Math.max(8, 14 * scale)}px`,
                  borderBottom: '2px solid #ff0000',
                  flexShrink: 0, // 縮小を防ぐ
                }}
              >
                {key === 'approval' ? '承認' : key === 'confirmation' ? '確認' : '作成'}
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: `${Math.max(1, 4 * scale)}px`, // さらにパディングを減らす
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                <StampMark
                  name={stamp.data.stamps[key as keyof typeof stamp.data.stamps]}
                  onClick={() => handleStampClick(key as 'approval' | 'confirmation' | 'creation')}
                  scale={scale}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 4. 受注番号 - 縦線のスタイル修正 */}
        {scale > 0.25 && (
          <div
            style={{
              padding: `${Math.max(4, 12 * scale)}px ${Math.max(6, 15 * scale)}px`,
              fontSize: `${Math.max(8, 16 * scale)}px`,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              flex: `0 0 ${Math.max(20, 50 * scale)}px`,
              borderTop: '3px solid #ff0000',
              position: 'relative', // 追加
            }}
          >
            <div
              style={{
                flex: '0 0 auto',
                marginRight: `${Math.max(4, 8 * scale)}px`,
              }}
            >
              {scale > 0.35 ? '受注番号' : '受注'}
            </div>
            {scale > 0.3 && (
              <div
                style={{
                  position: 'absolute', // absoluteに変更
                  left: `${Math.max(50, 107 * scale)}px`, // 位置を調整
                  top: 0, // 上端から
                  bottom: 0, // 下端まで
                  width: '2px',
                  background: '#ff0000', // borderではなくbackgroundに
                }}
              />
            )}
            {isEditingOrderNo ? (
              <input
                type="text"
                value={tempOrderNo}
                onChange={(e) => setTempOrderNo(e.target.value)}
                onBlur={() => {
                  onUpdate({ ...stamp, data: { ...stamp.data, orderNo: tempOrderNo } })
                  setIsEditingOrderNo(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdate({ ...stamp, data: { ...stamp.data, orderNo: tempOrderNo } })
                    setIsEditingOrderNo(false)
                  }
                }}
                style={{
                  border: '1px solid #ff0000',
                  color: '#ff0000',
                  flex: 1,
                  minWidth: 0,
                  padding: '2px 5px',
                  fontFamily: '"游明朝", "Yu Mincho", serif',
                  fontSize: `${Math.max(8, 16 * scale)}px`,
                  marginLeft: scale > 0.3 ? `${Math.max(20, 40 * scale)}px` : '10px', // 縦線との間隔
                }}
                autoFocus
              />
            ) : (
              <span
                onClick={() => setIsEditingOrderNo(true)}
                style={{
                  cursor: 'pointer',
                  flex: 1,
                  letterSpacing: `${0.1 * scale}rem`,
                  marginLeft: scale > 0.3 ? `${Math.max(20, 40 * scale)}px` : '10px', // 縦線との間隔
                }}
              >
                {stamp.data.orderNo || '_________'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ApprovalStamp
