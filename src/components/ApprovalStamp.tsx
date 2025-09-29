// ApprovalStamp.tsx (Final Polish)
import React, { useState } from 'react'

// (Type definitions remain the same)
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
  showDeleteButtons?: boolean
}

const StampMark: React.FC<{ name: string | null; onClick: () => void }> = ({ name, onClick }) => {
  const getFontSize = (text: string) => {
    const length = text.length
    if (length <= 2) return 40
    if (length === 3) return 30
    if (length === 4) return 22
    return 18
  }

  if (!name) {
    return (
      <g onClick={onClick} style={{ cursor: 'pointer' }}>
        <circle
          cx="26"
          cy="25"
          r="50"
          stroke="#ccc"
          strokeWidth="1"
          strokeDasharray="4 2"
          fill="none"
        />
        <text x="28" y="28" textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#999">
          クリック
        </text>
      </g>
    )
  }

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <circle
        cx="27"
        cy="25"
        r="50"
        stroke="#ff0000"
        strokeWidth="1.5"
        fill="rgba(255, 255, 255, 0.9)"
      />
      <text
        x="28"
        y="28"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ff0000"
        fontSize={getFontSize(name)}
        fontWeight="bold"
      >
        {name}
      </text>
    </g>
  )
}

export const ApprovalStamp: React.FC<ApprovalStampProps> = ({
  stamp,
  onUpdate,
  onDelete,
  isDragging,
  showDeleteButtons = true,
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
          stamps: { ...stamp.data.stamps, [position]: newName || null },
        },
      })
    }
  }

  const handleUpdate = (field: 'date' | 'orderNo', value: string) => {
    onUpdate({ ...stamp, data: { ...stamp.data, [field]: value } })
    if (field === 'date') setIsEditingDate(false)
    if (field === 'orderNo') setIsEditingOrderNo(false)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: stamp.width,
        height: stamp.height,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 330"
        preserveAspectRatio="none"
        style={{ fontFamily: '"游明朝", "Yu Mincho", serif' }}
      >
        {/* Background and Outer Frame */}
        <rect
          x="0"
          y="0"
          width="400"
          height="330"
          fill="white"
          stroke="#ff0000"
          strokeWidth="4" // Keep outer frame thick
          vectorEffect="non-scaling-stroke"
        />

        {/* --- Header Section (80px high) --- */}
        <text
          x="200"
          y="40"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="24"
          fontWeight="bold"
          fill="#ff0000"
          letterSpacing="10"
        >
          {stamp.data.title || '検査成績表'}
        </text>

        {isEditingDate ? (
          <foreignObject x="250" y="50" width="140" height="25">
            <input
              type="text"
              value={tempDate}
              onChange={(e) => setTempDate(e.target.value)}
              onBlur={() => handleUpdate('date', tempDate)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate('date', tempDate)}
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid #ff0000',
                background: 'rgba(255, 255, 0, 0.1)',
                color: '#ff0000',
                fontSize: '14px',
                textAlign: 'right',
                paddingRight: '5px',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
          </foreignObject>
        ) : (
          <text
            x="385"
            y="65"
            textAnchor="end"
            fontSize="14"
            fill="#ff0000"
            onClick={() => setIsEditingDate(true)}
            style={{ cursor: 'pointer' }}
          >
            {stamp.data.date || '____年__月__日'}
          </text>
        )}
        {/* ★ Thinner inner line */}
        <line
          x1="0"
          y1="80"
          x2="400"
          y2="80"
          stroke="#ff0000"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {/* --- Company Name Section (50px high) --- */}
        <text
          x="200"
          y="105"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="18"
          fontWeight="bold"
          fill="#ff0000"
          letterSpacing="15"
        >
          {stamp.data.companyName || '協立機興株式会社'}
        </text>
        {/* ★ Thinner inner line */}
        <line
          x1="0"
          y1="130"
          x2="400"
          y2="130"
          stroke="#ff0000"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {/* --- Approval Section (150px high) --- */}
        {/* ★ Thinner inner line */}
        <line
          x1="0"
          y1="170"
          x2="400"
          y2="170"
          stroke="#ff0000"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x="66.5"
          y="150"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#ff0000"
        >
          承認
        </text>
        <text
          x="200"
          y="150"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#ff0000"
        >
          確認
        </text>
        <text
          x="333.5"
          y="150"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#ff0000"
        >
          作成
        </text>
        <g transform="translate(41.5, 200)">
          <StampMark
            name={stamp.data.stamps.approval}
            onClick={() => handleStampClick('approval')}
          />
        </g>
        <g transform="translate(175, 200)">
          <StampMark
            name={stamp.data.stamps.confirmation}
            onClick={() => handleStampClick('confirmation')}
          />
        </g>
        <g transform="translate(308.5, 200)">
          <StampMark
            name={stamp.data.stamps.creation}
            onClick={() => handleStampClick('creation')}
          />
        </g>
        {/* ★ Thinner inner lines */}
        <line
          x1="133"
          y1="130"
          x2="133"
          y2="280"
          stroke="#ff0000"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="266"
          y1="130"
          x2="266"
          y2="280"
          stroke="#ff0000"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* --- Order Number Section (50px high) --- */}
        {/* ★ Thinner inner line */}
        <line
          x1="0"
          y1="280"
          x2="400"
          y2="280"
          stroke="#ff0000"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x="20"
          y="305"
          dominantBaseline="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#ff0000"
        >
          受注番号
        </text>
        {/* ★ Aligned vertical line (138 -> 133) and made it thinner */}
        <line
          x1="133"
          y1="280"
          x2="133"
          y2="330"
          stroke="#ff0000"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />

        {isEditingOrderNo ? (
          // ★ Adjusted position to match the new line (150 -> 145)
          <foreignObject x="145" y="290" width="245" height="25">
            <input
              type="text"
              value={tempOrderNo}
              onChange={(e) => setTempOrderNo(e.target.value)}
              onBlur={() => handleUpdate('orderNo', tempOrderNo)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate('orderNo', tempOrderNo)}
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid #ff0000',
                background: 'rgba(255, 255, 0, 0.1)',
                color: '#ff0000',
                fontSize: '16px',
                paddingLeft: '5px',
                boxSizing: 'border-box',
                letterSpacing: '2px',
              }}
              autoFocus
            />
          </foreignObject>
        ) : (
          // ★ Adjusted position to match the new line (150 -> 145)
          <text
            x="145"
            y="305"
            dominantBaseline="middle"
            fontSize="16"
            fontWeight="bold"
            fill="#ff0000"
            onClick={() => setIsEditingOrderNo(true)}
            style={{ cursor: 'pointer' }}
            letterSpacing="2"
          >
            {stamp.data.orderNo || '_________'}
          </text>
        )}
      </svg>

      {/* Delete button (no changes) */}
      {showDeleteButtons && (
        <button
          onClick={() => onDelete(stamp.id)}
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#ff0000',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            zIndex: 10,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

export default ApprovalStamp
