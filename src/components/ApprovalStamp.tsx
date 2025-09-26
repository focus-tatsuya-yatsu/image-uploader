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

// 印鑑デザインのコンポーネント
const StampMark: React.FC<{ name: string | null; onClick: () => void }> = ({ name, onClick }) => {
  if (!name) {
    return (
      <div
        onClick={onClick}
        style={{
          width: '60px',
          height: '60px',
          border: '2px dashed #ccc',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '12px',
          color: '#999',
        }}
      >
        クリック
      </div>
    )
  }

  // 文字数によってフォントサイズを調整
  const getFontSize = (text: string) => {
    const length = text.length
    if (length <= 2) return '1.5rem'
    if (length === 3) return '1rem'
    if (length === 4) return '0.7rem'
    if (length === 5) return '0.6rem'
    return '0.5rem' // 6文字以上
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: '3px solid #ff0000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.9)',
        fontFamily: '"游明朝", "Yu Mincho", serif',
        fontSize: getFontSize(name),
        color: '#ff0000',
        fontWeight: 'bold',
        cursor: 'pointer',
        padding: '2px', // 内側にパディングを追加
        boxSizing: 'border-box', // ボックスサイジングを追加
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

  // 日付を 年/月/日 にパースする
  const dateParts = stamp.data.date.match(/(\d{4})[^\d]*(\d{1,2})[^\d]*(\d{1,2})/)
  const year = dateParts ? dateParts[1] : '____'
  const month = dateParts ? dateParts[2] : '__'
  const day = dateParts ? dateParts[3] : '__'

  return (
    <div
      style={{
        position: 'absolute',
        left: `${stamp.x}px`,
        top: `${stamp.y}px`,
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

      {/* メインコンテナ - 高さを計算して配分 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        }}
      >
        {/* 1. タイトルと日付 - 固定高さ */}
        <div
          style={{
            borderBottom: '3px solid #ff0000',
            padding: '10px 15px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '80px', // ★固定高さ
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.3rem' }}>
            {stamp.data.title}
          </div>
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              marginTop: '5px',
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
                  padding: '2px 5px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  width: '120px',
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
                  letterSpacing: '2px',
                }}
              >
                {year} 年 {month} 月 {day} 日
              </span>
            )}
          </div>
        </div>

        {/* 2. 会社名 - 固定高さ */}
        <div
          style={{
            padding: '12px 8px',
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            borderBottom: '3px solid #ff0000',
            height: '50px',
            color: '#ff0000',
            letterSpacing: '0.5rem',
          }}
        >
          {stamp.data.companyName}
        </div>

        {/* 3. 承認欄 */}
        <div
          style={{
            display: 'flex',
            flex: 1, // ★ 修正点: heightを直接計算する代わりにflex: 1を指定
            minHeight: 0, // ★ 修正点: flexコンテナ内での縮小時のあふれを防ぐおまじないです
          }}
        >
          {/* 承認 */}
          <div
            style={{
              flex: 1,
              borderRight: '2px solid #ff0000',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                borderBottom: '2px solid #ff0000',
              }}
            >
              承認
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
              }}
            >
              <StampMark
                name={stamp.data.stamps.approval}
                onClick={() => handleStampClick('approval')}
              />
            </div>
          </div>

          {/* 確認 */}
          <div
            style={{
              flex: 1,
              borderRight: '2px solid #ff0000',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                borderBottom: '2px solid #ff0000',
              }}
            >
              確認
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
              }}
            >
              <StampMark
                name={stamp.data.stamps.confirmation}
                onClick={() => handleStampClick('confirmation')}
              />
            </div>
          </div>

          {/* 作成 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                borderBottom: '2px solid #ff0000',
              }}
            >
              作成
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
              }}
            >
              <StampMark
                name={stamp.data.stamps.creation}
                onClick={() => handleStampClick('creation')}
              />
            </div>
          </div>
        </div>

        {/* 4. 受注番号 - 固定高さで最下部 */}
        <div
          style={{
            padding: '12px 15px',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            height: '50px',
            boxSizing: 'border-box',
            borderTop: '3px solid #ff0000',
          }}
        >
          <div
            style={{
              flex: '0 0 107px', // 横幅を120pxで固定（お好みで調整してください）
              display: 'flex',
              alignItems: 'center', // 上下中央揃え
              justifyContent: 'center', // 左右中央揃え
              height: '100%', // 親の高さ全体に広げる
              paddingRight: '0.6rem',
            }}
          >
            <span>受注番号</span>
          </div>
          <div
            style={{
              borderRight: '2px solid #ff0000',
              margin: '0 8px',
              alignSelf: 'stretch',
              marginTop: '-12px', // ← 追加：上の隙間を埋める
              marginBottom: '-12px', // ← 追加：下の隙間を埋める
              marginRight: '12px',
            }}
          ></div>
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
                fontFamily: '"游明朝", "Yu Mincho", serif', // フォントファミリーを統一
                fontSize: '16px', // フォントサイズを統一
              }}
              autoFocus
            />
          ) : (
            <span
              onClick={() => setIsEditingOrderNo(true)}
              style={{
                cursor: 'pointer',
                marginLeft: '5px',
                flex: 1,
                letterSpacing: '0.1rem',
              }}
            >
              {stamp.data.orderNo || '_________'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApprovalStamp
