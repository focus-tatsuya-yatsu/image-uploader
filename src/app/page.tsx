'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import jsPDF from 'jspdf'
import UTIF from 'utif'
import NextImage from 'next/image'

// 型定義
interface Box {
  id: number
  x: number
  y: number
  width: number
  height: number
  value: string | null
  index: number
  decimalPlaces: number
  isManuallyEdited?: boolean
  isOutOfTolerance?: boolean
  fontSize?: number  // 追加：個別のフォントサイズ設定
}

interface ResizeHandle {
  position: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w'
  cursor: string
}

interface Measurement {
  name: string
  value: string
  unit: string
  error?: string
  isOutOfTolerance?: boolean
}

interface ContextMenu {
  visible: boolean
  x: number
  y: number
  boxId: number | null
}

interface ViewTransform {
  scale: number
  translateX: number
  translateY: number
}

// SaveDialogコンポーネント
const SaveDialog: React.FC<{
  showSaveDialog: boolean
  setShowSaveDialog: (show: boolean) => void
  saveFileName: string
  setSaveFileName: (name: string) => void
  isSaving: boolean
  performSave: () => Promise<void>
}> = React.memo(
  ({ showSaveDialog, setShowSaveDialog, saveFileName, setSaveFileName, isSaving, performSave }) => {
    if (!showSaveDialog) return null

    const getDefaultFileName = () => {
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10)
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-')
      return `図面_${dateStr}_${timeStr}`
    }

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(5px)',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            width: '500px',
            maxWidth: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            fontFamily: '"Noto Sans JP", sans-serif',
          }}
        >
          <h2
            style={{
              marginBottom: '25px',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            💾 PDFとして保存
          </h2>

          <div style={{ marginBottom: '25px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '10px',
                color: '#555',
                fontWeight: '500',
              }}
            >
              ファイル名:
            </label>
            <input
              type="text"
              value={saveFileName}
              onChange={(e) => setSaveFileName(e.target.value)}
              placeholder={getDefaultFileName()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSaving) {
                  performSave()
                } else if (e.key === 'Escape') {
                  setShowSaveDialog(false)
                  setSaveFileName('')
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '15px',
                fontFamily: '"Noto Sans JP", sans-serif',
                transition: 'border-color 0.2s',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#667eea'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e0e0e0'
              }}
              autoFocus
              disabled={isSaving}
            />
            <small
              style={{
                color: '#888',
                fontSize: '12px',
                marginTop: '5px',
                display: 'block',
              }}
            >
              ※ .pdf 拡張子は自動的に追加されます
            </small>
          </div>

          {'showSaveFilePicker' in window && (
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
              💡 <strong>ヒント:</strong> 保存ボタンを押すと、保存場所を選択できます
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={() => {
                setShowSaveDialog(false)
                setSaveFileName('')
              }}
              disabled={isSaving}
              style={{
                padding: '10px 24px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                background: 'white',
                color: '#666',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                fontFamily: '"Noto Sans JP", sans-serif',
                transition: 'all 0.2s',
                opacity: isSaving ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.background = '#f5f5f5'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white'
              }}
            >
              キャンセル
            </button>
            <button
              onClick={performSave}
              disabled={isSaving}
              style={{
                padding: '10px 32px',
                background: isSaving ? '#999' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                fontFamily: '"Noto Sans JP", sans-serif',
                transition: 'all 0.2s',
                boxShadow: isSaving ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    )
  }
)

// メインコンポーネント
const MeasurementPage = () => {
  // State管理
  const [boxes, setBoxes] = useState<Box[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [drawingImage, setDrawingImage] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentBox, setCurrentBox] = useState<Box | null>(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [drawMode, setDrawMode] = useState(true)
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null)
  const [hoveredBox, setHoveredBox] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [textColorMode, setTextColorMode] = useState<'black' | 'white'>('black')
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    boxId: null,
  })
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [defaultDecimalPlaces, setDefaultDecimalPlaces] = useState(2)
  const [editingBoxId, setEditingBoxId] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [minBoxSize, setMinBoxSize] = useState(3)
  const [minFontSize, setMinFontSize] = useState(2)
  const [showBoxNumbers, setShowBoxNumbers] = useState(true)
  const [showDeleteButtons, setShowDeleteButtons] = useState(true)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveFileName, setSaveFileName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDraggingBox, setIsDraggingBox] = useState(false)
  const [draggedBoxId, setDraggedBoxId] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showGuide, setShowGuide] = useState(false) // 使い方ガイドの表示状態
  const [isResizing, setIsResizing] = useState(false)
  const [resizingBoxId, setResizingBoxId] = useState<number | null>(null)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle['position'] | null>(null)
  const [resizeStartBox, setResizeStartBox] = useState<Box | null>(null)
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 })
  const [tempFontSize, setTempFontSize] = useState<number | null>(null)
  const [isSliderDragging, setIsSliderDragging] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // PDF.jsの動的インポート
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadPdfJs = async () => {
        try {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
          script.async = true

          script.onload = () => {
            if ((window as any).pdfjsLib) {
              ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
              console.log('PDF.js loaded successfully')
            }
          }

          script.onerror = () => {
            console.error('Failed to load PDF.js')
            setPdfLoadError('PDF.jsのロードに失敗しました')
          }

          document.body.appendChild(script)

          return () => {
            if (document.body.contains(script)) {
              document.body.removeChild(script)
            }
          }
        } catch (error) {
          console.error('Error loading PDF.js:', error)
        }
      }

      loadPdfJs()
    }
  }, [])

  // 編集入力フォーカス
  useEffect(() => {
    if (editingBoxId !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingBoxId])

  // 値のフォーマット関数
  const formatValue = (value: string | null, decimalPlaces: number): string => {
    if (!value) return ''
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return value
    return numValue.toFixed(decimalPlaces)
  }

  // ボックスの線幅を動的に計算
  const calculateBorderWidth = (boxWidth: number, boxHeight: number, scale: number): number => {
    const minSize = Math.min(boxWidth, boxHeight)

    let baseWidth: number
    if (minSize < 10) {
      baseWidth = 0
    } else if (minSize < 20) {
      baseWidth = 0.8
    } else if (minSize < 30) {
      baseWidth = 1
    } else if (minSize < 50) {
      baseWidth = 1.5
    } else {
      baseWidth = 2
    }

    const scaledWidth = scale < 1 ? baseWidth / scale : baseWidth / Math.max(1, scale / 2)

    return Math.max(0, Math.min(3, scaledWidth))
  }

  // ズームレベルに応じた要素サイズを計算
  const getScaledElementSize = (baseSize: number, scale: number): number => {
    return baseSize / Math.max(1, scale / 2)
  }

  // 座標変換関数
  const screenToCanvas = (screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }

    const x = (screenX - rect.left - viewTransform.translateX) / viewTransform.scale
    const y = (screenY - rect.top - viewTransform.translateY) / viewTransform.scale

    return { x, y }
  }

  // ズーム処理
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!canvasRef.current || drawMode) return
      e.preventDefault()

      const rect = canvasRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(Math.max(viewTransform.scale * scaleFactor, 0.5), 1000)

      const scaleChange = newScale - viewTransform.scale
      const newTranslateX = viewTransform.translateX - (mouseX * scaleChange) / newScale
      const newTranslateY = viewTransform.translateY - (mouseY * scaleChange) / newScale

      setViewTransform({
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      })
    },
    [drawMode, viewTransform]
  )

  // ホイールイベントリスナー
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false })
      return () => canvas.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // 動的なフォントサイズ計算
  const calculateOptimalFontSize = (
    text: string,
    boxWidth: number,
    boxHeight: number,
    isVertical: boolean,
    customFontSize?: number  // カスタムフォントサイズパラメータを追加
  ): number => {
     // カスタムフォントサイズが設定されている場合はそれを返す
  if (customFontSize !== undefined && customFontSize > 0) {
    return customFontSize
  }

    const padding = 2
    const availableWidth = boxWidth - padding * 2
    const availableHeight = boxHeight - padding * 2

    if (Math.min(boxWidth, boxHeight) < 15) {
      return Math.max(1, Math.min(availableHeight * 0.6, availableWidth * 0.8))
    }

    if (isVertical) {
      const charHeight = availableHeight / text.length
      const fontSize = Math.min(charHeight * 0.8, availableWidth * 0.9)
      return Math.max(minFontSize, Math.min(fontSize, 24))
    } else {
      const estimatedCharWidth = 0.6
      const requiredWidth = text.length * estimatedCharWidth

      const fontSizeByWidth = availableWidth / requiredWidth
      const fontSizeByHeight = availableHeight * 0.8

      const optimalSize = Math.min(fontSizeByWidth, fontSizeByHeight)

      return Math.max(minFontSize, Math.min(optimalSize, 32))
    }
  }

  // ダブルクリックで編集開始
  const handleBoxDoubleClick = (box: Box) => {
    if (!drawMode) {
      setEditingBoxId(box.id)
      setEditingValue(box.value || '')
    }
  }

  // 編集確定
  const handleEditConfirm = () => {
    if (editingBoxId !== null) {
      setBoxes((prev) =>
        prev.map((box) =>
          box.id === editingBoxId ? { ...box, value: editingValue, isManuallyEdited: true } : box
        )
      )
      setEditingBoxId(null)
      setEditingValue('')
    }
  }

  // 編集キャンセル
  const handleEditCancel = () => {
    setEditingBoxId(null)
    setEditingValue('')
  }

  // パン開始
  const handlePanStart = (e: React.MouseEvent) => {
    if (!drawMode && e.button === 0 && !e.ctrlKey) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  // パン移動
  const handlePanMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y

      setViewTransform((prev) => ({
        ...prev,
        translateX: prev.translateX + dx,
        translateY: prev.translateY + dy,
      }))

      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  // パン終了
  const handlePanEnd = () => {
    setIsPanning(false)
  }

  // 右クリックメニュー表示（位置自動調整機能付き）
  const handleContextMenu = (e: React.MouseEvent, boxId: number) => {
    e.preventDefault()
    e.stopPropagation()

    // メニューの推定サイズ
    const menuHeight = 830 // メニューの推定高さ
    const menuWidth = 250 // メニューの推定幅

    // ウィンドウのサイズを取得
    const windowHeight = window.innerHeight
    const windowWidth = window.innerWidth

    // クリック位置
    let x = e.clientX + 50
    let y = e.clientY + 100

    // 右端チェック
    if (x + menuWidth > windowWidth) {
      x = windowWidth - menuWidth - 10 // 右端から10px余白
    }

    // 下端チェック - メニューが画面外に出る場合は上に表示
    if (y + menuHeight > windowHeight) {
      // メニューを上に表示（クリック位置の上にメニューの下端が来るように）
      y = Math.max(10, y - menuHeight + 100) // 最低でも上から10pxの位置
    }

    // 上端チェック
    if (y < 10) {
      y = 10
    }

    setContextMenu({
      visible: true,
      x,
      y,
      boxId,
    })
  }

  // 右クリックメニュー非表示
  const hideContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, boxId: null })
    setTempFontSize(null)
  }

  // 桁数変更
  const changeDecimalPlaces = (boxId: number, decimalPlaces: number) => {
    setBoxes((prev) =>
      prev.map((box) => {
        if (box.id === boxId) {
          if (box.value) {
            const numValue = parseFloat(box.value)
            if (!isNaN(numValue)) {
              return {
                ...box,
                decimalPlaces,
                value: box.value,
              }
            }
          }
          return { ...box, decimalPlaces }
        }
        return box
      })
    )
    hideContextMenu()
  }

  // フォントサイズ変更関数を追加
  const changeFontSize = (boxId: number, fontSize: number | undefined) => {
    setBoxes((prev) =>
      prev.map((box) => {
        if (box.id === boxId) {
          return { ...box, fontSize }
        }
        return box
      })
    )
    // hideContextMenu()を呼ばないようにする（メニューは開いたまま）
    if (fontSize === undefined) {
      setTempFontSize(null)
    }
  }

  // インデックス変更機能を追加
  const changeBoxIndex = (boxId: number, newIndex: number) => {
    // 0ベースのインデックスに変換（ユーザー入力は1ベース）
    const targetIndex = newIndex - 1

    // 負の値や大きすぎる値のチェック
    if (targetIndex < 0 || targetIndex > 999) {
      alert('番号は1から1000の間で入力してください')
      return
    }

    // 既存のボックスで同じインデックスを持つものがあるかチェック
    const existingBox = boxes.find((b) => b.index === targetIndex && b.id !== boxId)

    if (existingBox) {
      if (!confirm(`番号 ${newIndex} は既に使用されています。上書きしますか？`)) {
        return
      }
    }

    setBoxes((prev) =>
      prev.map((box) => {
        if (box.id === boxId) {
          return { ...box, index: targetIndex }
        }
        return box
      })
    )

    hideContextMenu()
  }

  // すべてのボックスの桁数を一括変更
  const changeAllDecimalPlaces = (decimalPlaces: number) => {
    setBoxes((prev) =>
      prev.map((box) => ({
        ...box,
        decimalPlaces,
      }))
    )
    setDefaultDecimalPlaces(decimalPlaces)
  }

  // 改良版PDFテキスト抽出（ZEISS形式対応修正版）
  const extractMeasurementsFromPDF = async (file: File) => {
    try {
      setPdfLoadError(null)

      // PDF.jsの読み込み待機
      let retryCount = 0
      while (!(window as any).pdfjsLib && retryCount < 10) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        retryCount++
      }

      if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
        const pdfjsLib = (window as any).pdfjsLib
        console.log('PDF.js is ready, starting extraction...')

        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
          useSystemFonts: true,
          standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/',
        }).promise

        console.log(`PDFページ数: ${pdf.numPages}`)
        const extractedMeasurements: Measurement[] = []

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum)
          const textContent = await page.getTextContent()
          const textItems = textContent.items as any[]

          // テキストアイテムを位置でソート
          const sortedItems = textItems.sort((a: any, b: any) => {
            const yDiff = b.transform[5] - a.transform[5]
            if (Math.abs(yDiff) > 2) return yDiff
            return a.transform[4] - b.transform[4]
          })

          // 行ごとにグループ化
          const rows: any[] = []
          let currentRow: any[] = []
          let lastY: number | null = null

          for (const item of sortedItems) {
            const y = Math.round(item.transform[5])

            if (lastY === null || Math.abs(y - lastY) < 3) {
              currentRow.push(item)
            } else {
              if (currentRow.length > 0) {
                rows.push(currentRow)
              }
              currentRow = [item]
            }
            lastY = y
          }
          if (currentRow.length > 0) {
            rows.push(currentRow)
          }

          // ZEISS形式かどうかを判定
          let isZeissFormat = false
          for (const row of rows) {
            const rowText = row
              .map((item: any) => item.str)
              .join(' ')
              .trim()
            if (
              rowText.includes('ZEISS CALYPSO') ||
              (rowText.includes('測定値') && rowText.includes('設計値'))
            ) {
              isZeissFormat = true
              console.log('ZEISS形式を検出しました')
              break
            }
          }

          // 測定データの抽出（修正版）
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowItems = row
              .map((item: any) => item.str.trim())
              .filter((s: string) => s.length > 0)
            const rowText = rowItems.join(' ')

            // ZEISS形式のPDF処理部分の修正版
            if (isZeissFormat) {
              // ZEISS形式の処理
              if (rowItems.length >= 2) {
                let measuredValueIndex = -1
                let measuredValue = null
                let designValue = null
                let upperTolerance = null
                let lowerTolerance = null
                let unitFound = 'mm'

                // 数値パターンを持つ要素を探す
                for (let j = 0; j < rowItems.length; j++) {
                  const item = rowItems[j].replace(/\s*mm\s*$/, '')

                  // 測定値のパターン（小数点を含む数値）
                  if (/^[-]?\d+\.\d{3,4}$/.test(item)) {
                    // 最初の数値が測定値
                    if (!measuredValue) {
                      measuredValue = item
                      measuredValueIndex = j
                    }
                    // 2番目の数値が設計値
                    else if (!designValue) {
                      designValue = item
                    }
                    // 3番目の数値が公差(+)
                    else if (!upperTolerance) {
                      upperTolerance = item
                    }
                    // 4番目の数値が公差(-)
                    else if (!lowerTolerance) {
                      lowerTolerance = item
                    }
                  }
                }

                // 測定値が見つかった場合、名前を構築
                if (measuredValue && measuredValueIndex > 0) {
                  let nameParts: string[] = []
                  for (let k = 0; k < measuredValueIndex; k++) {
                    const part = rowItems[k].trim()
                    if (
                      part &&
                      part !== '名前' &&
                      part !== '測定値' &&
                      part !== '設計値' &&
                      part !== '公差(+)' &&
                      part !== '公差(-)' &&
                      part !== '誤差' &&
                      part !== '+/-'
                    ) {
                      nameParts.push(part)
                    }
                  }

                  let name = nameParts.join('')

                  if (name && measuredValue) {
                    const exists = extractedMeasurements.some(
                      (m) => m.name === name && m.value === measuredValue
                    )

                    if (!exists) {
                      // 許容範囲チェック
                      let isOutOfTolerance = false
                      if (designValue && upperTolerance && lowerTolerance) {
                        const measured = parseFloat(measuredValue)
                        const design = parseFloat(designValue)
                        const upper = parseFloat(upperTolerance)
                        const lower = parseFloat(lowerTolerance)

                        if (!isNaN(measured) && !isNaN(design) && !isNaN(upper) && !isNaN(lower)) {
                          const error = measured - design
                          // 公差範囲外かチェック
                          isOutOfTolerance = error > upper || error < lower
                        }
                      }

                      extractedMeasurements.push({
                        name: name,
                        value: measuredValue,
                        unit: unitFound,
                        isOutOfTolerance: isOutOfTolerance,
                      })
                      console.log(
                        `ZEISS形式: ${name} = ${measuredValue} ${unitFound}${isOutOfTolerance ? ' [許容範囲外]' : ''}`
                      )
                    }
                  }
                }
              }
            } else {
              // Calypso形式のパターン（既存のまま）
              const calypsoPatterns = [
                /^(.+?)\s+([-]?\d+\.\d{4})\s+([-]?\d+\.\d{4})\s+([-]?\d+\.\d{4})\s+([-]?\d+\.\d{4})\s*/,
                /^([A-Za-z_\-]+[\d_]*(?:_[A-Za-z0-9]+)*)\s+([-]?\d+\.\d{4})\s+([-]?\d+\.\d{4})\s+([-]?\d+\.\d{4})\s+([-]?\d+\.\d{4})\s*/,
              ]

              for (const pattern of calypsoPatterns) {
                const match = rowText.match(pattern)
                if (match) {
                  let name = match[1]
                    .trim()
                    .replace(/\s+/g, '')
                    .replace(/([A-Z])-([A-Z])/g, '$1-$2')
                    .replace(/([^_])_([^_])/g, '$1_$2')
                  const measuredValue = match[2] // 実測値
                  const designValue = match[3] // 基準値
                  const upperTolerance = match[4] // 上許容差
                  const lowerTolerance = match[5] // 下許容差

                  // 許容範囲チェック
                  let isOutOfTolerance = false
                  if (measuredValue && designValue && upperTolerance && lowerTolerance) {
                    const measured = parseFloat(measuredValue)
                    const design = parseFloat(designValue)
                    const upper = parseFloat(upperTolerance)
                    const lower = parseFloat(lowerTolerance)

                    if (!isNaN(measured) && !isNaN(design) && !isNaN(upper) && !isNaN(lower)) {
                      const error = measured - design
                      isOutOfTolerance = error > upper || error < lower
                    }
                  }

                  const exists = extractedMeasurements.some(
                    (m) => m.name === name && m.value === measuredValue
                  )

                  if (!exists && !name.includes('設計値') && !name.includes('公差')) {
                    extractedMeasurements.push({
                      name: name,
                      value: measuredValue,
                      unit: 'mm',
                      isOutOfTolerance: isOutOfTolerance,
                    })
                    console.log(
                      `Calypso形式: ${name} = ${measuredValue} mm${isOutOfTolerance ? ' [許容範囲外]' : ''}`
                    )
                    break
                  }
                }
              }
            }
          }
        }

        console.log('抽出された測定値:', extractedMeasurements)

        if (extractedMeasurements.length > 0) {
          setMeasurements(extractedMeasurements)
          setPdfLoaded(true)
          alert(`${extractedMeasurements.length}個の測定値を抽出しました。`)
        } else {
          console.log('自動抽出失敗、フォールバックデータを使用')
          loadFallbackData()
        }
      } else {
        console.error('PDF.jsがロードされていません')
        setPdfLoadError('PDF.jsのロードに失敗しました')
        loadFallbackData()
      }
    } catch (error) {
      console.error('PDF解析エラー:', error)
      setPdfLoadError('PDF解析中にエラーが発生しました')
      loadFallbackData()
    }
  }

  // フォールバックデータ（ZEISS形式のサンプルデータに更新）
  const loadFallbackData = () => {
    setPdfLoadError('PDFの自動解析に失敗したため、手動データを使用します。')

    const manualData: Measurement[] = [
      { name: '平面度1', value: '0.0392', unit: 'mm' },
      { name: 'X-値円1_6H7', value: '12.5385', unit: 'mm' },
      { name: 'Y-値円1_6H7', value: '190.0109', unit: 'mm' },
      { name: '直径円1_6H7', value: '6.0188', unit: 'mm' },
      { name: '真円度円1_6H7', value: '0.0015', unit: 'mm' },
      { name: '同心度3', value: '0.0706', unit: 'mm' },
      { name: '直径円16', value: '15.9222', unit: 'mm' },
    ]

    setMeasurements(manualData)
    setPdfLoaded(true)

    setTimeout(() => {
      alert(`手動データ使用: ${manualData.length}個の測定値をロードしました。`)
    }, 100)
  }

  // 空いている最小の番号を取得する関数を追加
  const getNextAvailableIndex = (boxes: Box[]): number => {
    // 現在使用中のインデックスを取得
    const usedIndices = boxes.map((box) => box.index).sort((a, b) => a - b)

    // 0から順番に空いている番号を探す
    for (let i = 0; i < usedIndices.length; i++) {
      if (usedIndices[i] !== i) {
        return i // 空いている番号を返す
      }
    }

    // すべて連番の場合は次の番号を返す
    return usedIndices.length
  }

  // 図面アップロード処理
  const handleDrawingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // TIFFファイルの処理
    if (
      file.type === 'image/tiff' ||
      file.name.toLowerCase().endsWith('.tif') ||
      file.name.toLowerCase().endsWith('.tiff')
    ) {
      try {
        // TIFFファイルをArrayBufferとして読み込み
        const arrayBuffer = await file.arrayBuffer()

        // UTIFでデコード
        const ifds = UTIF.decode(arrayBuffer)

        if (ifds.length === 0) {
          alert('TIFFファイルの読み込みに失敗しました')
          return
        }

        // 最初のページをデコード
        const firstPage = ifds[0]
        UTIF.decodeImage(arrayBuffer, firstPage)

        // RGBAデータを取得
        const rgba = UTIF.toRGBA8(firstPage)

        // Canvasに描画
        const canvas = document.createElement('canvas')
        canvas.width = firstPage.width
        canvas.height = firstPage.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          alert('Canvas作成に失敗しました')
          return
        }

        // ImageDataを作成
        const imageData = new ImageData(
          new Uint8ClampedArray(rgba.buffer),
          firstPage.width,
          firstPage.height
        )

        // Canvasに描画
        ctx.putImageData(imageData, 0, 0)

        // CanvasをData URLに変換
        const dataUrl = canvas.toDataURL('image/png')

        // 画像として設定
        setDrawingImage(dataUrl)
        setViewTransform({ scale: 1, translateX: 0, translateY: 0 })

        console.log(`TIFF画像を変換しました: ${firstPage.width}x${firstPage.height}`)
      } catch (error) {
        console.error('TIFF処理エラー:', error)
        alert('TIFFファイルの処理中にエラーが発生しました')
      }
    }
    // 通常の画像ファイルの処理（JPEG、PNG等）
    else if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setDrawingImage(e.target?.result as string)
        setViewTransform({ scale: 1, translateX: 0, translateY: 0 })
      }
      reader.readAsDataURL(file)
    } else {
      alert('対応していないファイル形式です。JPEG、PNG、TIFFファイルを選択してください。')
    }
  }

  // PDFアップロード処理
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      await extractMeasurementsFromPDF(file)
    }
  }

  // マウスダウン処理（修正版）
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e || typeof e.preventDefault !== 'function') {
      console.warn('Invalid event object')
      return
    }

    e.preventDefault()
    e.stopPropagation()

    if (e.button === 2) return

    if (!drawMode) {
      handlePanStart(e)
      return
    }

    if (!drawingImage || !canvasRef.current) return

    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    const newIndex = getNextAvailableIndex(boxes) // 事前に番号を取得

    setIsDrawing(true)
    setStartPos(canvasPos)
    setCurrentBox({
      id: Date.now(),
      x: canvasPos.x,
      y: canvasPos.y,
      width: 0,
      height: 0,
      value: null,
      index: newIndex, // boxes.lengthではなく、空いている番号を使用
      decimalPlaces: defaultDecimalPlaces,
      fontSize: undefined, // 明示的にundefinedを設定（自動計算を使用）
    })
  }

  // ボックスのドラッグ開始処理
  const handleBoxMouseDown = (e: React.MouseEvent, boxId: number) => {
    e.stopPropagation()

    if (!drawMode && e.button === 0 && !e.ctrlKey) {
      // 移動モードでボックスをクリックした場合
      const box = boxes.find((b) => b.id === boxId)
      if (!box) return

      const canvasPos = screenToCanvas(e.clientX, e.clientY)

      // ドラッグ開始
      setIsDraggingBox(true)
      setDraggedBoxId(boxId)
      setDragOffset({
        x: canvasPos.x - box.x,
        y: canvasPos.y - box.y,
      })
    }
  }

  // マウス移動処理
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e || typeof e.preventDefault !== 'function') {
      return
    }

    e.preventDefault()

    // ボックスのドラッグ処理を追加
    if (isDraggingBox && draggedBoxId !== null) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY)

      setBoxes((prev) =>
        prev.map((box) => {
          if (box.id === draggedBoxId) {
            return {
              ...box,
              x: canvasPos.x - dragOffset.x,
              y: canvasPos.y - dragOffset.y,
            }
          }
          return box
        })
      )
      return
    }

    // リサイズ処理（handleMouseMoveに追加）
    if (isResizing && resizingBoxId !== null && resizeHandle && resizeStartBox) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY)
      const dx = canvasPos.x - resizeStartPos.x
      const dy = canvasPos.y - resizeStartPos.y

      setBoxes((prev) =>
        prev.map((box) => {
          if (box.id === resizingBoxId) {
            let newX = resizeStartBox.x
            let newY = resizeStartBox.y
            let newWidth = resizeStartBox.width
            let newHeight = resizeStartBox.height

            // ハンドル位置に応じてリサイズ処理
            switch (resizeHandle) {
              case 'nw':
                newX = resizeStartBox.x + dx
                newY = resizeStartBox.y + dy
                newWidth = resizeStartBox.width - dx
                newHeight = resizeStartBox.height - dy
                break
              case 'ne':
                newY = resizeStartBox.y + dy
                newWidth = resizeStartBox.width + dx
                newHeight = resizeStartBox.height - dy
                break
              case 'se':
                newWidth = resizeStartBox.width + dx
                newHeight = resizeStartBox.height + dy
                break
              case 'sw':
                newX = resizeStartBox.x + dx
                newWidth = resizeStartBox.width - dx
                newHeight = resizeStartBox.height + dy
                break
              case 'n':
                newY = resizeStartBox.y + dy
                newHeight = resizeStartBox.height - dy
                break
              case 'e':
                newWidth = resizeStartBox.width + dx
                break
              case 's':
                newHeight = resizeStartBox.height + dy
                break
              case 'w':
                newX = resizeStartBox.x + dx
                newWidth = resizeStartBox.width - dx
                break
            }

            // 最小サイズの制限
            if (newWidth < minBoxSize) {
              newWidth = minBoxSize
              if (resizeHandle.includes('w')) {
                newX = resizeStartBox.x + resizeStartBox.width - minBoxSize
              }
            }
            if (newHeight < minBoxSize) {
              newHeight = minBoxSize
              if (resizeHandle.includes('n')) {
                newY = resizeStartBox.y + resizeStartBox.height - minBoxSize
              }
            }

            return {
              ...box,
              x: newX,
              y: newY,
              width: newWidth,
              height: newHeight,
            }
          }
          return box
        })
      )
      return
    }

    if (isPanning) {
      handlePanMove(e)
      return
    }

    if (isPanning) {
      handlePanMove(e)
      return
    }

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setMousePos({ x, y })

      if (hoveredBox !== null) {
        const box = boxes.find((b) => b.id === hoveredBox)
        if (box && box.value) {
          const tooltipWidth = 200
          const tooltipHeight = 80
          const padding = 15

          let tooltipX = x + padding
          let tooltipY = y - tooltipHeight - 5

          if (x + tooltipWidth + padding > rect.width) {
            tooltipX = x - tooltipWidth - padding
          }

          if (y - tooltipHeight - 5 < 0) {
            tooltipY = y + padding
          }

          if (tooltipX < 0) {
            tooltipX = padding
          }

          setTooltipPosition({ x: tooltipX, y: tooltipY })
        }
      }
    }

    if (!isDrawing || !currentBox || !canvasRef.current) return

    const canvasPos = screenToCanvas(e.clientX, e.clientY)

    const width = Math.abs(canvasPos.x - startPos.x)
    const height = Math.abs(canvasPos.y - startPos.y)
    const x = Math.min(startPos.x, canvasPos.x)
    const y = Math.min(startPos.y, canvasPos.y)

    setCurrentBox((prev) =>
      prev
        ? {
            ...prev,
            x,
            y,
            width,
            height,
          }
        : null
    )
  }

  // マウスアップ処理（修正版）
  const handleMouseUp = (e?: React.MouseEvent<HTMLDivElement>) => {
    // リサイズ終了処理
    if (isResizing) {
      setIsResizing(false)
      setResizingBoxId(null)
      setResizeHandle(null)
      setResizeStartBox(null)
      return
    }

    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }

    // ボックスのドラッグ終了
    if (isDraggingBox) {
      setIsDraggingBox(false)
      setDraggedBoxId(null)
      setDragOffset({ x: 0, y: 0 })
      return
    }

    if (isPanning) {
      handlePanEnd()
      return
    }

    if (!isDrawing || !currentBox) return

    setIsDrawing(false)

    if (currentBox.width > minBoxSize && currentBox.height > minBoxSize) {
      // 空いている最小の番号を取得して設定
      const newIndex = getNextAvailableIndex(boxes)
      const newBox = {
        ...currentBox,
        index: newIndex, // boxes.lengthではなく、空いている番号を使用
      }
      setBoxes((prev) => [...prev, newBox])
    }

    setCurrentBox(null)
  }

  // リサイズハンドルのスタイル定義
  const resizeHandleStyle = (
    handle: ResizeHandle['position'],
    handleSize: number,
    textColor: string
  ) => ({
    position: 'absolute' as const,
    width: `${handleSize}px`,
    height: `${handleSize}px`,
    background: textColor === 'white' ? '#ffffff' : '#667eea',
    border: `1px solid ${textColor === 'white' ? '#000' : '#fff'}`,
    borderRadius: handle.length === 2 ? '50%' : '2px', // 角は円形、辺は四角
    cursor: RESIZE_HANDLES.find((h) => h.position === handle)?.cursor || 'default',
    zIndex: 11,
    opacity: 0.8,
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1,
    },
  })

  // 選択的転記機能を追加（個別のボックスに特定の測定値を割り当て）
  const assignSpecificValue = (boxId: number, measurementIndex: number) => {
    setBoxes((prev) =>
      prev.map((box) => {
        if (box.id === boxId && measurements[measurementIndex]) {
          return {
            ...box,
            value: measurements[measurementIndex].value,
            isOutOfTolerance: measurements[measurementIndex].isOutOfTolerance,
            isManuallyEdited: false, // 自動転記フラグをリセット
          }
        }
        return box
      })
    )
  }

  // 測定値自動転記
  const autoAssignValues = () => {
    const updatedBoxes = boxes.map((box) => {
      if (box.isManuallyEdited) {
        return box
      }
      // box.indexに対応する測定値を正確に取得
      // indexは0ベースなので、測定値配列の対応する位置から取得
      const measurementIndex = box.index

      if (measurements[measurementIndex]) {
        return {
          ...box,
          value: measurements[measurementIndex].value,
          isOutOfTolerance: measurements[measurementIndex].isOutOfTolerance,
        }
      }
      return box
    })
    setBoxes(updatedBoxes)
  }

  // ボックスクリア
  const clearBoxes = () => {
    if (confirm('すべてのボックスを削除しますか？')) {
      setBoxes([])
    }
  }

  // ビューリセット
  const resetView = () => {
    setViewTransform({ scale: 1, translateX: 0, translateY: 0 })
  }

  // リサイズハンドルの定義（定数として追加）
  const RESIZE_HANDLES: ResizeHandle[] = [
    { position: 'nw', cursor: 'nw-resize' },
    { position: 'ne', cursor: 'ne-resize' },
    { position: 'se', cursor: 'se-resize' },
    { position: 'sw', cursor: 'sw-resize' },
    { position: 'n', cursor: 'n-resize' },
    { position: 'e', cursor: 'e-resize' },
    { position: 's', cursor: 's-resize' },
    { position: 'w', cursor: 'w-resize' },
  ]

  // リサイズハンドルの位置計算関数
  const getHandlePosition = (box: Box, handle: ResizeHandle['position'], handleSize: number) => {
    const halfSize = handleSize / 2

    switch (handle) {
      case 'nw':
        return { x: box.x - halfSize, y: box.y - halfSize }
      case 'ne':
        return { x: box.x + box.width - halfSize, y: box.y - halfSize }
      case 'se':
        return { x: box.x + box.width - halfSize, y: box.y + box.height - halfSize }
      case 'sw':
        return { x: box.x - halfSize, y: box.y + box.height - halfSize }
      case 'n':
        return { x: box.x + box.width / 2 - halfSize, y: box.y - halfSize }
      case 'e':
        return { x: box.x + box.width - halfSize, y: box.y + box.height / 2 - halfSize }
      case 's':
        return { x: box.x + box.width / 2 - halfSize, y: box.y + box.height - halfSize }
      case 'w':
        return { x: box.x - halfSize, y: box.y + box.height / 2 - halfSize }
      default:
        return { x: 0, y: 0 }
    }
  }

  // リサイズ開始処理
  const handleResizeStart = (
    e: React.MouseEvent,
    boxId: number,
    handle: ResizeHandle['position']
  ) => {
    e.stopPropagation()
    e.preventDefault()

    const box = boxes.find((b) => b.id === boxId)
    if (!box) return

    const canvasPos = screenToCanvas(e.clientX, e.clientY)

    setIsResizing(true)
    setResizingBoxId(boxId)
    setResizeHandle(handle)
    setResizeStartBox({ ...box })
    setResizeStartPos(canvasPos)
  }

  // performSave関数を独立して定義
  const performSave = async () => {
    setIsSaving(true)

    const exportCanvas = document.createElement('canvas')
    const ctx = exportCanvas.getContext('2d')

    if (!ctx || !canvasRef.current) {
      setIsSaving(false)
      return
    }

    try {
      // UIを一時的に非表示
      setHoveredBox(null)
      hideContextMenu()
      setEditingBoxId(null)
      setShowBoxNumbers(false)
      setShowDeleteButtons(false)

      // 高解像度設定
      const scale = 3
      const rect = canvasRef.current.getBoundingClientRect()
      exportCanvas.width = rect.width * scale
      exportCanvas.height = rect.height * scale
      ctx.scale(scale, scale)

      // 背景を白に
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, rect.width, rect.height)

      // 背景画像を描画
      if (drawingImage) {
        const img = new Image()
        img.src = drawingImage
        await new Promise((resolve) => {
          img.onload = resolve
        })
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }

      // ボックスとテキストを手動で描画
      boxes.forEach((box) => {
        // ボックスの枠を描画
        ctx.strokeStyle = box.isOutOfTolerance ? '#ff0000' : '#ff6b6b'
        ctx.lineWidth = calculateBorderWidth(box.width, box.height, 1)
        ctx.strokeRect(box.x, box.y, box.width, box.height)

        // 背景色
        ctx.fillStyle = box.isOutOfTolerance ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 107, 107, 0.1)'
        ctx.fillRect(box.x, box.y, box.width, box.height)

        // テキストを描画
        if (box.value) {
          const formattedValue = formatValue(box.value, box.decimalPlaces)
          const isVertical = box.height > box.width * 1.5

          const fontSize = calculateOptimalFontSize(
            formattedValue,
            box.width,
            box.height,
            isVertical
          )
          ctx.font = `bold ${fontSize}px "Noto Sans JP", sans-serif`
          ctx.fillStyle = box.isOutOfTolerance
            ? '#ff0000' // 許容範囲外なら赤色
            : textColorMode === 'white'
              ? '#ffffff'
              : '#333333' // そうでなければ通常の色
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'

          if (isVertical) {
            // 縦書き処理
            ctx.save()
            ctx.translate(box.x + box.width / 2, box.y + box.height / 2)

            // 文字を一つずつ縦に配置
            const chars = formattedValue.split('')
            const charHeight = box.height / chars.length
            chars.forEach((char, i) => {
              const y = -box.height / 2 + charHeight * (i + 0.5)
              ctx.fillText(char, 0, y)
            })

            ctx.restore()
          } else {
            // 横書き
            ctx.fillText(formattedValue, box.x + box.width / 2, box.y + box.height / 2)
          }
        }
      })

      // PDFを生成
      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const imgData = exportCanvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210)

      // ファイル名を決定（デフォルトファイル名の生成）
      const getDefaultFileName = () => {
        const now = new Date()
        const dateStr = now.toISOString().slice(0, 10)
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '-')
        return `測定結果_${dateStr}_${timeStr}`
      }

      const finalFileName = saveFileName || getDefaultFileName()

      // File System Access APIをサポートしているか確認
      if ('showSaveFilePicker' in window) {
        try {
          // ネイティブの保存ダイアログを表示
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `${finalFileName}.pdf`,
            types: [
              {
                description: 'PDFファイル',
                accept: { 'application/pdf': ['.pdf'] },
              },
            ],
            startIn: 'downloads',
          })

          const writable = await handle.createWritable()
          const pdfBlob = pdf.output('blob')
          await writable.write(pdfBlob)
          await writable.close()

          // 成功メッセージ
          alert('✅ PDFを保存しました！')
        } catch (err: any) {
          // ユーザーがキャンセルした場合
          if (err.name === 'AbortError') {
            console.log('保存がキャンセルされました')
          } else {
            console.error('保存エラー:', err)
            // エラー時はフォールバック
            pdf.save(`${finalFileName}.pdf`)
            alert('⚠️ ネイティブ保存に失敗したため、通常のダウンロードで保存しました。')
          }
        }
      } else {
        // File System Access API非対応のブラウザ
        pdf.save(`${finalFileName}.pdf`)
        alert('📥 PDFをダウンロードフォルダに保存しました！')
      }

      // UIを再表示
      setShowBoxNumbers(true)
      setShowDeleteButtons(true)

      // ダイアログを閉じる
      setShowSaveDialog(false)
      setSaveFileName('')
    } catch (error) {
      console.error('PDF保存エラー:', error)
      alert('❌ PDFの保存に失敗しました。')
    } finally {
      setIsSaving(false)
    }
  }

  // 結果を保存
  const exportResult = async () => {
    // 保存ダイアログを表示
    setShowSaveDialog(true)

    // デフォルトファイル名を設定
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '-')
    setSaveFileName(`測定結果_${dateStr}_${timeStr}`)
  }

  // ボックス番号を再採番する機能（オプション）
  const renumberBoxes = () => {
    if (!confirm('番号を整理しますか？\n※測定値との対応関係がリセットされます')) {
      return
    }

    setBoxes((prev) => {
      // 現在のindex順でソート
      const sorted = [...prev].sort((a, b) => a.index - b.index)

      // 値のマッピングを保持（必要な場合）
      const valueMapping = new Map()
      sorted.forEach((box, newIndex) => {
        if (box.value && !box.isManuallyEdited) {
          valueMapping.set(newIndex, box.value)
        }
      })

      // 0から順番に番号を振り直す
      return sorted.map((box, newIndex) => ({
        ...box,
        index: newIndex,
        // 番号整理時に値を維持するかどうか選択可能
        value: box.isManuallyEdited ? box.value : null,
        isOutOfTolerance: box.isManuallyEdited ? box.isOutOfTolerance : false,
      }))
    })
  }

  // ボックス削除
  const deleteBox = (boxId: number) => {
    setBoxes((prev) => prev.filter((box) => box.id !== boxId))
  }

  // スタイル定義（改善版）
  const styles = {
    container: {
      fontFamily:
        '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    mainContainer: {
      width: '100%',
      maxWidth: '1600px',
      height: 'calc(100vh - 20px)',
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    header: {
      background: 'linear-gradient(135deg, #DDDDDD 10%, #888888 100%)',
      color: 'white',
      padding: '15px 20px',
      textAlign: 'center' as const,
      flexShrink: 0,
    },
    controls: {
      padding: '15px 20px',
      background: '#f8f9fa',
      borderBottom: '2px solid #e9ecef',
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap' as const,
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    },
    controlsLeft: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap' as const,
      alignItems: 'center',
      flex: 1,
    },
    autoAssignButton: {
      padding: '12px 30px',
      fontSize: '16px',
      fontWeight: 'bold' as const,
      background:
        pdfLoaded && boxes.length > 0
          ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
          : '#999',
      color: 'white',
      border: 'none',
      borderRadius: '25px',
      cursor: pdfLoaded && boxes.length > 0 ? 'pointer' : 'not-allowed',
      boxShadow: pdfLoaded && boxes.length > 0 ? '0 4px 15px rgba(40, 167, 69, 0.4)' : 'none',
      transition: 'all 0.3s',
      fontFamily: '"Noto Sans JP", sans-serif',
      marginLeft: 'auto',
      flexShrink: 0,
    },
    uploadBtn: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '20px',
      cursor: 'pointer',
      fontWeight: '600',
      fontFamily: '"Noto Sans JP", sans-serif',
      fontSize: '14px',
    },
    actionBtn: (active: boolean) => ({
      padding: '6px 14px',
      borderRadius: '15px',
      border: '2px solid #667eea',
      background: active ? '#667eea' : 'white',
      color: active ? 'white' : '#667eea',
      cursor: 'pointer',
      fontWeight: '600',
      fontFamily: '"Noto Sans JP", sans-serif',
      fontSize: '13px',
    }),
    // スクロール可能なメインコンテンツ
    scrollableContent: {
      flex: 1,
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const,
    },
    mainContent: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr',
      gap: '20px',
      padding: '20px',
      height: '100%',
    },
    panel: {
      background: '#f8f9fa',
      borderRadius: '15px',
      padding: '20px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    canvasContainer: {
      position: 'relative' as const,
      width: '100%',
      height: '500px',
      background: 'white',
      border: '2px solid #e9ecef',
      borderRadius: '10px',
      overflow: 'hidden',
      cursor: isResizing
        ? RESIZE_HANDLES.find((h) => h.position === resizeHandle)?.cursor || 'default'
        : drawMode
          ? 'crosshair'
          : isPanning
            ? 'grabbing'
            : isDraggingBox
              ? 'grabbing'
              : 'grab',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      MozUserSelect: 'none' as const,
      msUserSelect: 'none' as const,
    },
    transformContainer: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      transform: `scale(${viewTransform.scale}) translate(${viewTransform.translateX / viewTransform.scale}px, ${viewTransform.translateY / viewTransform.scale}px)`,
      transformOrigin: '0 0',
      transition: isPanning ? 'none' : 'transform 0.2s ease',
    },
    image: {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain' as const,
      pointerEvents: 'none' as const,
      userSelect: 'none' as const,
      WebkitUserDrag: 'none' as const,
      MozUserDrag: 'none' as const,
      userDrag: 'none' as const,
    },
    
    box: (
      isVertical: boolean,
      fontSize: number,
      textColor: string,
      isEditing: boolean,
      borderWidth: number,
      isOutOfTolerance?: boolean,
      boxSize?: number,
      isDragging?: boolean
    ) => {
      // ボックスサイズに応じて背景の透明度を調整
      const getBackgroundAlpha = () => {
        if (!boxSize) return isOutOfTolerance ? 0.2 : 0.1

        // 小さいボックスほど透明度を上げる（薄くする）
        if (isOutOfTolerance) {
          if (boxSize < 30) return 0.05 // 非常に小さい場合はほぼ透明
          if (boxSize < 50) return 0.1
          if (boxSize < 100) return 0.15
          return 0.2
        }

        // 通常のボックス
        if (textColor === 'white') return 0.7
        return 0.1
      }

      return {
        position: 'absolute' as const,
        border: isEditing
          ? `${Math.max(2, borderWidth)}px solid #00ff00`
          : isDragging
            ? `${Math.max(2, borderWidth)}px solid #0066ff` // ドラッグ中は青枠
            : isOutOfTolerance
              ? `${borderWidth}px solid #ff0000` // 許容範囲外は赤枠
              : textColor === 'white'
                ? `${borderWidth}px solid #ffffff`
                : `${borderWidth}px solid #ff6b6b`,
        background: isEditing
          ? 'rgba(0, 255, 0, 0.1)'
          : isDragging
            ? 'rgba(0, 102, 255, 0.2)' // ドラッグ中は青背景
            : isOutOfTolerance
              ? `rgba(255, 0, 0, ${getBackgroundAlpha()})` // 動的な透明度
              : textColor === 'white'
                ? `rgba(0, 0, 0, ${getBackgroundAlpha()})`
                : `rgba(255, 107, 107, ${getBackgroundAlpha()})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: drawMode
          ? 'default'
          : isDragging
            ? 'grabbing' // ドラッグ中
            : 'grab', // ドラッグ可能
        writingMode: isVertical ? ('vertical-rl' as const) : ('horizontal-tb' as const),
        textOrientation: isVertical ? ('upright' as const) : ('mixed' as const),
        userSelect: 'none' as const,
        fontSize: `${fontSize}px`,
        fontFamily: '"Noto Sans JP", sans-serif',
        transition: isDragging ? 'none' : 'box-shadow 0.2s', // ドラッグ中はトランジション無効
        boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.3)' : 'none', // ドラッグ中に影を追加
      }
    },
    boxNumber: (textColor: string, scaledSize: number) => ({
      position: 'absolute' as const,
      top: `-${scaledSize + 10}px`,
      left: '0',
      background: textColor === 'white' ? '#ffffff' : '#ff6b6b',
      color: textColor === 'white' ? '#000000' : 'white',
      padding: `${scaledSize * 0.15}px ${scaledSize * 0.6}px`,
      borderRadius: `${scaledSize * 0.9}px`,
      fontSize: `${scaledSize}px`,
      fontWeight: 'bold' as const,
      writingMode: 'horizontal-tb' as const,
      zIndex: 10,
      fontFamily: '"Noto Sans JP", sans-serif',
      display: showBoxNumbers ? 'block' : 'none',
    }),
    boxValue: (textColor: string, isOutOfTolerance?: boolean) => ({
      fontWeight: 'bold' as const,
      color: isOutOfTolerance
        ? '#ff0000' // 許容範囲外は赤文字
        : textColor === 'white'
          ? '#ffffff'
          : '#333333',
      padding: '2px',
      fontFamily: '"Noto Sans JP", sans-serif',
    }),
    editInput: {
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '80%',
      padding: '4px',
      fontSize: '14px',
      textAlign: 'center' as const,
      border: '2px solid #00ff00',
      borderRadius: '4px',
      background: 'white',
      zIndex: 100,
      fontFamily: '"Noto Sans JP", sans-serif',
    },
    measurementList: {
      background: 'white',
      border: '2px solid #e9ecef',
      borderRadius: '10px',
      padding: '15px',
      // flex: 1, // 親要素の残りスペースを全て使用
      overflowY: 'auto' as const,
      maxHeight: '500px',
      // height: '100%',
      // boxSizing: 'border-box' as const,
    },
    measurementItem: (assigned: boolean, outOfTolerance?: boolean) => ({
      padding: '8px',
      margin: '5px 0',
      background: assigned ? '#d4edda' : outOfTolerance ? '#f8d7da' : '#f8f9fa',
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '14px',
      fontFamily: '"Noto Sans JP", sans-serif',
    }),
    deleteBtn: (textColor: string, scaledSize: number) => ({
      position: 'absolute' as const,
      top: `${scaledSize * 0.3}px`,
      right: `${scaledSize * 0.3}px`,
      background: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'white',
      border:
        textColor === 'white'
          ? `${Math.max(1, scaledSize * 0.05)}px solid #ffffff`
          : `${Math.max(1, scaledSize * 0.05)}px solid #ff6b6b`,
      borderRadius: '50%',
      width: `${scaledSize * 1.3}px`,
      height: `${scaledSize * 1.3}px`,
      cursor: 'pointer',
      display: showDeleteButtons && !drawMode && !editingBoxId ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${scaledSize * 0.8}px`,
      color: textColor === 'white' ? '#000000' : '#ff6b6b',
      fontWeight: 'bold' as const,
      zIndex: 10,
      fontFamily: '"Noto Sans JP", sans-serif',
    }),

    errorMessage: {
      background: '#f8d7da',
      color: '#721c24',
      padding: '10px',
      borderRadius: '5px',
      marginTop: '10px',
    },
    tooltip: {
      position: 'absolute' as const,
      background: 'rgba(0, 0, 0, 0.95)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 'normal' as const,
      pointerEvents: 'none' as const,
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      whiteSpace: 'nowrap' as const,
      border: '1px solid rgba(255,255,255,0.2)',
      backdropFilter: 'blur(8px)',
      fontFamily: '"Noto Sans JP", sans-serif',
    },
    contextMenu: {
      position: 'fixed' as const,
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      paddingBottom: '8px',
      zIndex: 2000,
      minWidth: '200px',
      maxWidth: '300px',
      maxHeight: '78vh', // 画面の80%までの高さに制限
      overflowY: 'auto' as const, // スクロール可能に
      overflowX: 'hidden' as const,
    },
    contextMenuItem: {
      padding: '8px 16px',
      cursor: 'pointer',
      fontSize: '14px',
      color: '#333',
      transition: 'background 0.2s',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontFamily: '"Noto Sans JP", sans-serif',
    },
    contextMenuSection: {
      maxHeight: '250px', // セクションごとの高さ制限
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const,
      borderBottom: '1px solid #e0e0e0',
    },
    zoomInfo: {
      position: 'absolute' as const,
      bottom: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 100,
      fontFamily: '"Noto Sans JP", sans-serif',
    },
    decimalControl: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 8px',
      background: '#f0f0f0',
      borderRadius: '12px',
      fontSize: '13px',
    },
    // 固定ステータスバー
    statusBar: {
      padding: '15px 20px',
      background: '#e9ecef',
      borderTop: '2px solid #dee2e6',
      flexShrink: 0,
    },
    statusContent: {
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap' as const,
      alignItems: 'center',
      fontSize: '14px',
      fontFamily: '"Noto Sans JP", sans-serif',
    },
    statusItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
    },
    // 使い方ガイドのスタイル
    guideSection: {
      background: '#fafafa',
      borderTop: '1px solid #dee2e6',
      flexShrink: 0,
    },
    guideToggle: {
      width: '100%',
      padding: '12px 20px',
      background: '#fafafa',
      border: 'none',
      borderTop: '1px solid #e9ecef',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      fontWeight: 'bold' as const,
      color: '#333',
      fontFamily: '"Noto Sans JP", sans-serif',
      transition: 'background 0.2s',
    },
    guideContent: {
      padding: '20px',
      background: '#f0f8ff',
      fontSize: '13px',
      color: '#555',
      borderTop: '1px solid #dee2e6',
      animation: 'slideDown 0.3s ease',
    },
  }

  // ドラッグ防止
  useEffect(() => {
    const preventDrag = (e: DragEvent) => {
      if (drawMode) {
        e.preventDefault()
        return false
      }
    }

    document.addEventListener('dragstart', preventDrag)

    return () => {
      document.removeEventListener('dragstart', preventDrag)
    }
  }, [drawMode])

  // 右クリックメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isSliderDragging) {
        return
      }
      
      const target = e.target as HTMLElement

      // ボタン要素のチェックを追加
    if (target.tagName === 'BUTTON' && target.closest('[data-slider-container="true"]')) {
      return // スライダーコンテナ内のボタンは無視
    }
      
      // input[type="range"]の親要素も含めてチェック
      const isSliderInteraction = target.closest('input[type="range"]') || 
                                  target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range'
      if (isSliderInteraction) {
        return
      }
      
      hideContextMenu()
    }
    
    if (contextMenu.visible) {
      // mousedownイベントも追加して早期に判定
      const handleMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range') {
          setIsSliderDragging(true)
        }
      }
      
      const handleMouseUp = () => {
        setIsSliderDragging(false)
      }
      
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
        document.addEventListener('mousedown', handleMouseDown)
        document.addEventListener('mouseup', handleMouseUp)
      }, 100)
      
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('mousedown', handleMouseDown)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [contextMenu.visible, isSliderDragging])

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSliderDragging) {
        setIsSliderDragging(false)
      }
    }
    
    // グローバルにmouseupを監視
    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchend', handleGlobalMouseUp)
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchend', handleGlobalMouseUp)
    }
  }, [isSliderDragging])

  useEffect(() => {
    const sliderStyles = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        position: relative;
        z-index: 2;
      }
  
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
  
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
  
      input[type="range"]::-moz-range-thumb:hover {
        transform: scale(1.2);
      }
    `
  
    const styleSheet = document.createElement("style")
    styleSheet.textContent = sliderStyles
    document.head.appendChild(styleSheet)
  
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet)
      }
    }
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.mainContainer}>
        <div style={styles.header}>
          <h1 style={{ margin: '0', fontSize: '24px' }}>図面測定値転記システム</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>CalypsoとZEISS両形式のPDFに対応</p>
        </div>

        <div style={styles.controls}>
          <div style={styles.controlsLeft}>
            <label>
              <input
                type="file"
                accept="image/*,.tif,.tiff"
                onChange={handleDrawingUpload}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <button style={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
              📐 図面をアップロード
              </button>
            </label>

            <label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfUpload}
                style={{ display: 'none' }}
                ref={pdfInputRef}
              />
              <button style={styles.uploadBtn} onClick={() => pdfInputRef.current?.click()}>
                📄 測定結果PDFをアップロード
              </button>
            </label>

            <button style={styles.actionBtn(drawMode)} onClick={() => setDrawMode(!drawMode)}>
              {drawMode ? '✏️ 描画モード' : '🤚 移動・編集モード'}
            </button>

            <button
              style={styles.actionBtn(showBoxNumbers)}
              onClick={() => setShowBoxNumbers(!showBoxNumbers)}
              title="ボックス番号の表示/非表示"
            >
              {showBoxNumbers ? '🔢 番号表示' : '🔢 番号非表示'}
            </button>

            <button
              style={styles.actionBtn(showDeleteButtons)}
              onClick={() => setShowDeleteButtons(!showDeleteButtons)}
              title="削除ボタンの表示/非表示"
            >
              {showDeleteButtons ? '❌ 削除ボタン表示' : '❌ 削除ボタン非表示'}
            </button>

            <button style={styles.actionBtn(false)} onClick={clearBoxes}>
              🗑️ ボックスをクリア
            </button>

            <button
              style={styles.actionBtn(textColorMode === 'white')}
              onClick={() => setTextColorMode((prev) => (prev === 'black' ? 'white' : 'black'))}
              title="文字色を切り替え"
            >
              {textColorMode === 'black' ? '⚫' : '⚪'} 文字色
            </button>

            <button style={styles.actionBtn(false)} onClick={resetView}>
              🔄 表示リセット
            </button>

            <button
              style={styles.actionBtn(false)}
              onClick={renumberBoxes}
              title="ボックス番号を連番に整理"
            >
              🔢 番号整理
            </button>

            <button style={styles.actionBtn(false)} onClick={exportResult}>
              💾 結果を保存
            </button>

            <div style={styles.decimalControl}>
              <span>デフォルト桁数:</span>
              <input
                type="number"
                min="0"
                max="4"
                value={defaultDecimalPlaces}
                onChange={(e) => setDefaultDecimalPlaces(parseInt(e.target.value) || 0)}
                style={{
                  width: '40px',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
              <button
                onClick={() => changeAllDecimalPlaces(defaultDecimalPlaces)}
                style={{
                  padding: '2px 6px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                一括適用
              </button>
            </div>

            <div style={styles.decimalControl}>
              <span>最小BOX:</span>
              <input
                type="number"
                min="1"
                max="20"
                value={minBoxSize}
                onChange={(e) => setMinBoxSize(parseInt(e.target.value) || 3)}
                style={{
                  width: '40px',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
              <span>px</span>
            </div>
          </div>

          {/* 自動転記ボタンを右端に配置 */}
          <button
            style={styles.autoAssignButton}
            onClick={autoAssignValues}
            disabled={!pdfLoaded || boxes.length === 0}
            onMouseEnter={(e) => {
              if (pdfLoaded && boxes.length > 0) {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.5)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.4)'
            }}
          >
            📝 測定値を自動転記
          </button>
        </div>

        {/* スクロール可能なメインコンテンツ */}
        <div style={styles.scrollableContent}>
          <div style={styles.mainContent}>
            <div style={styles.panel}>
              <h3>📐 図面（ズーム: {Math.round(viewTransform.scale * 100)}%）</h3>
              <div
                ref={canvasRef}
                style={styles.canvasContainer}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => handleMouseUp()}
                onDragStart={(e) => e.preventDefault()}
              >
                <div style={styles.transformContainer}>
                  {drawingImage && (
                    <NextImage
                      src={drawingImage}
                      alt="Drawing"
                      fill
                      style={{ objectFit: 'contain' }}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                    />
                  )}

                  {/* 作成済みボックス */}
                  {boxes.map((box) => {
                    const isVertical = box.height > box.width * 1.5
                    const formattedValue = formatValue(box.value, box.decimalPlaces)
                    const fontSize = box.value
                      ? calculateOptimalFontSize(
                        formattedValue,
                        box.width,
                        box.height,
                        isVertical,
                        box.fontSize // カスタムフォントサイズを渡す
                      )
                      : 14
                    const isEditing = editingBoxId === box.id

                    const borderWidth = calculateBorderWidth(
                      box.width,
                      box.height,
                      viewTransform.scale
                    )
                    const scaledNumberSize = getScaledElementSize(14, viewTransform.scale)
                    const scaledDeleteBtnSize = getScaledElementSize(16, viewTransform.scale)
                    // ボックスの最小サイズを計算
                    const minBoxDimension = Math.min(box.width, box.height)

                    return (
                      <div
                        key={box.id}
                        style={{
                          ...styles.box(
                            isVertical,
                            fontSize,
                            textColorMode,
                            isEditing,
                            borderWidth,
                            box.isOutOfTolerance,
                            minBoxDimension,
                            draggedBoxId === box.id
                          ),
                          left: `${box.x}px`,
                          top: `${box.y}px`,
                          width: `${box.width}px`,
                          height: `${box.height}px`,
                        }}
                        onMouseDown={(e) => handleBoxMouseDown(e, box.id)}
                        onContextMenu={(e) => handleContextMenu(e, box.id)}
                        onDoubleClick={() => handleBoxDoubleClick(box)}
                        onMouseEnter={(e) => {
                          if (box.value && !isEditing && !isDraggingBox) {
                            setHoveredBox(box.id)
                            if (canvasRef.current) {
                              const rect = canvasRef.current.getBoundingClientRect()
                              const boxRect = e.currentTarget.getBoundingClientRect()
                              const x =
                                (boxRect.left - rect.left + box.width / 2) * viewTransform.scale
                              const y = (boxRect.top - rect.top) * viewTransform.scale

                              const tooltipWidth = 200
                              const tooltipHeight = 80
                              const padding = 10

                              let tooltipX = x - tooltipWidth / 2
                              let tooltipY = y - tooltipHeight - padding

                              if (tooltipX < 0) tooltipX = padding
                              if (tooltipX + tooltipWidth > rect.width) {
                                tooltipX = rect.width - tooltipWidth - padding
                              }
                              if (tooltipY < 0) {
                                tooltipY = y + box.height * viewTransform.scale + padding
                              }

                              setTooltipPosition({ x: tooltipX, y: tooltipY })
                            }
                          }
                        }}
                        onMouseLeave={() => setHoveredBox(null)}
                      >
                        <span style={styles.boxNumber(textColorMode, scaledNumberSize)}>
                          {box.index + 1}
                          {box.isManuallyEdited && ' ✏️'}
                        </span>
                        {/* 値の表示部分 */}
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditConfirm()
                              } else if (e.key === 'Escape') {
                                handleEditCancel()
                              }
                            }}
                            onBlur={handleEditConfirm}
                            style={styles.editInput}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          box.value && (
                            <span
                              style={{
                                ...styles.boxValue(textColorMode, box.isOutOfTolerance),
                                // 小さいボックスでも見やすくするための追加スタイル
                                textShadow:
                                  box.isOutOfTolerance && minBoxDimension < 50
                                    ? '0 0 2px white, 0 0 4px white' // 白い縁取りで文字を読みやすく
                                    : 'none',
                              }}
                            >
                              {formattedValue}
                            </span>
                          )
                        )}

                        {!isEditing && (
                          <button
                            style={styles.deleteBtn(textColorMode, scaledDeleteBtnSize)}
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteBox(box.id)
                            }}
                          >
                            ×
                          </button>
                        )}
                        {/* リサイズハンドル */}
                        {!drawMode && !editingBoxId && !isDraggingBox && !isPanning && (
                          <>
                            {RESIZE_HANDLES.map((handle) => {
                              const handleSize = getScaledElementSize(8, viewTransform.scale)
                              const pos = getHandlePosition(box, handle.position, handleSize)

                              return (
                                <div
                                  key={handle.position}
                                  style={{
                                    ...resizeHandleStyle(
                                      handle.position,
                                      handleSize,
                                      textColorMode
                                    ),
                                    left: `${pos.x - box.x}px`,
                                    top: `${pos.y - box.y}px`,
                                  }}
                                  onMouseDown={(e) => handleResizeStart(e, box.id, handle.position)}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '1'
                                    e.currentTarget.style.transform = 'scale(1.2)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '0.8'
                                    e.currentTarget.style.transform = 'scale(1)'
                                  }}
                                />
                              )
                            })}
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* 描画中のボックス */}
                  {currentBox && (
                    <div
                      style={{
                        ...styles.box(
                          currentBox.height > currentBox.width * 1.5,
                          14,
                          textColorMode,
                          false,
                          calculateBorderWidth(
                            currentBox.width,
                            currentBox.height,
                            viewTransform.scale
                          )
                        ),
                        left: `${currentBox.x}px`,
                        top: `${currentBox.y}px`,
                        width: `${currentBox.width}px`,
                        height: `${currentBox.height}px`,
                        opacity: 0.5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: `${getScaledElementSize(10, viewTransform.scale)}px`,
                          opacity: 0.7,
                        }}
                      >
                        {Math.round(currentBox.width)}×{Math.round(currentBox.height)}px
                      </span>
                    </div>
                  )}
                </div>

                {/* ツールチップ */}
                {hoveredBox !== null &&
                  (() => {
                    const box = boxes.find((b) => b.id === hoveredBox)
                    if (!box || !box.value) return null
                    const measurement = measurements[box.index]

                    return (
                      <div
                        style={{
                          ...styles.tooltip,
                          left: `${tooltipPosition.x}px`,
                          top: `${tooltipPosition.y}px`,
                          borderColor: box.isOutOfTolerance ? '#ff0000' : 'rgba(255,255,255,0.2)',
                        }}
                      >
                        <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                          #{box.index + 1} {measurement?.name || '（手動入力）'}
                        </div>
                        {box.isOutOfTolerance && (
                          <div
                            style={{
                              fontSize: '14px',
                              color: '#ff6666',
                              fontWeight: 'bold',
                              marginBottom: '4px',
                            }}
                          >
                            ⚠️ 許容範囲外
                          </div>
                        )}
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          元の値: {box.value} mm
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ff00' }}>
                          表示値: {formatValue(box.value, box.decimalPlaces)} mm
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
                          小数点: {box.decimalPlaces}桁 {box.isManuallyEdited && '(手動編集済み)'}
                        </div>
                      </div>
                    )
                  })()}

                {/* ズーム情報 */}
                {(viewTransform.scale !== 1 || currentBox) && (
                  <div style={styles.zoomInfo}>
                    ズーム: {Math.round(viewTransform.scale * 100)}%
                    {currentBox &&
                      ` | 作成中: ${Math.round(currentBox.width)}×${Math.round(currentBox.height)}px`}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.panel}>
              <h3>📋 測定結果</h3>
              {pdfLoadError && <div style={styles.errorMessage}>⚠️ {pdfLoadError}</div>}
              <div style={styles.measurementList}>
                {measurements.length === 0 ? (
                  <p style={{ color: '#999' }}>
                    PDFをアップロードすると測定値が表示されます
                    <br />
                    <small>※Calypso/ZEISS両形式対応</small>
                  </p>
                ) : (
                  measurements.map((m, index) => {
                    const box = boxes.find((b) => b.index === index)
                    const isAssigned = !!box?.value
                    const isManuallyEdited = box?.isManuallyEdited

                    return (
                      <div
                        key={index}
                        style={styles.measurementItem(isAssigned, m.isOutOfTolerance)}
                      >
                        <span style={{ flex: 1 }}>
                          <strong style={{ marginRight: '8px', color: '#666' }}>
                            #{index + 1}
                          </strong>
                          {m.name}
                          {isManuallyEdited && ' ✏️'}
                          {box && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#888',
                                marginLeft: '8px',
                              }}
                            >
                              → Box {box.index + 1}
                            </span>
                          )}
                        </span>
                        <strong style={{ color: m.isOutOfTolerance ? '#dc3545' : 'inherit' }}>
                          {m.value} {m.unit}
                        </strong>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ステータスバー（最下部に固定） */}
        <div style={styles.statusBar}>
          <div style={styles.statusContent}>
            <div style={styles.statusItem}>
              <span>ボックス数:</span>
              <strong>{boxes.length}</strong>
              {boxes.length > 0 && (
                <span style={{ fontSize: '11px', color: '#666' }}>
                  (番号:{' '}
                  {boxes
                    .map((b) => b.index + 1)
                    .sort((a, b) => a - b)
                    .join(', ')}
                  )
                </span>
              )}
            </div>
            <div style={styles.statusItem}>
              <span>測定値数:</span>
              <strong>{measurements.length}</strong>
            </div>
            <div style={styles.statusItem}>
              <span>転記済み:</span>
              <strong>{boxes.filter((b) => b.value).length}</strong>
            </div>
            <div style={styles.statusItem}>
              <span>手動編集:</span>
              <strong>{boxes.filter((b) => b.isManuallyEdited).length}</strong>
            </div>
            <div
              style={{
                ...styles.statusItem,
                color: measurements.some((m) => m.isOutOfTolerance) ? '#ff0000' : 'inherit',
              }}
            >
              <span>許容範囲外:</span>
              <strong>{measurements.filter((m) => m.isOutOfTolerance).length}</strong>
            </div>
            <div style={styles.statusItem}>
              <span>ズーム:</span>
              <strong>{Math.round(viewTransform.scale * 100)}%</strong>
            </div>
            <div style={styles.statusItem}>
              <span>最小サイズ:</span>
              <strong>{minBoxSize}px</strong>
            </div>
            <div style={styles.statusItem}>
              <span>最小フォント:</span>
              <strong>{minFontSize}px</strong>
            </div>
          </div>
        </div>

        {/* 使い方ガイド（折りたたみ可能） */}
        <div style={styles.guideSection}>
          <button
            style={styles.guideToggle}
            onClick={() => setShowGuide(!showGuide)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fafafa'
            }}
          >
            <span style={{ marginRight: '10px' }}>💡</span>
            <span style={{ flex: 1, textAlign: 'left' }}>使い方ガイド</span>
            <span
              style={{
                transform: showGuide ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
                display: 'inline-block',
              }}
            >
              ▼
            </span>
          </button>
          {showGuide && (
            <div style={styles.guideContent}>
              <ul style={{ margin: '0', paddingLeft: '20px', listStyle: 'none' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>🖱️ ダブルクリック:</strong> 値を手動編集
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>🖱️ 右クリック:</strong> 小数点桁数を変更、番号を変更
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>🔢 番号変更:</strong> 右クリック → 任意の番号（1〜1000）を直接指定可能
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>🤚 移動・編集モード + マウスホイール:</strong> ズーム（最大1000倍）
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>🤚 移動・編集モード + ドラッグ:</strong> 画面移動
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>🤚 移動・編集モード + リサイズハンドル :</strong> ボックスのサイズ調整
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>🤚 移動・編集モード + ボックスのドラッグ :</strong> ボックスの移動
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>🔄 Calypso/ZEISS形式:</strong> 両方のPDF形式に対応
                </li>
                <li>
                  <strong>✏️ マーク:</strong> 手動編集されたボックス
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 右クリックメニュー */}
      {contextMenu.visible && (
        <div
        data-context-menu="true"  // ⭐ 追加: 識別用のデータ属性
          style={{
            ...styles.contextMenu,
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '8px 16px',
              fontWeight: 'bold',
              borderBottom: '1px solid #e0e0e0',
              background: '#f5f5f5',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            📢 ボックス設定
          </div>

          {/* 番号変更セクション */}
          <div
            style={{
              ...styles.contextMenuItem,
              borderBottom: '1px solid #e0e0e0',
              paddingBottom: '12px',
              background: '#fff9e6',
            }}
            onClick={() => {
              const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
              if (currentBox) {
                const input = prompt(
                  `新しい番号を入力してください (現在: ${currentBox.index + 1})\n※1〜1000の範囲で入力`,
                  String(currentBox.index + 1)
                )
                if (input) {
                  const newIndex = parseInt(input)
                  if (!isNaN(newIndex)) {
                    changeBoxIndex(currentBox.id, newIndex)
                  } else {
                    alert('有効な数字を入力してください')
                  }
                }
              }
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🔢</span>
              <span>番号を変更</span>
            </span>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {(() => {
                const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
                return currentBox ? `現在: ${currentBox.index + 1}` : ''
              })()}
            </span>
          </div>

          {/* 測定値の選択セクション */}
          <div style={styles.contextMenuSection}>
            <div
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                color: '#666',
                borderBottom: '1px solid #e0e0e0',
                background: '#fafafa',
                position: 'sticky',
                top: 0,
              }}
            >
              測定値を選択: ({measurements.length}個)
            </div>
            {measurements.map((m, idx) => {
              const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
              const isCurrentValue = currentBox?.value === m.value

              return (
                <div
                  key={idx}
                  style={{
                    ...styles.contextMenuItem,
                    background: isCurrentValue ? '#e3f2fd' : 'transparent',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isCurrentValue ? '#e3f2fd' : 'transparent'
                  }}
                  onClick={() => {
                    if (contextMenu.boxId) {
                      assignSpecificValue(contextMenu.boxId, idx)
                      hideContextMenu()
                    }
                  }}
                >
                  <span>
                    #{idx + 1}: {m.name.length > 15 ? m.name.substring(0, 15) + '...' : m.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#666' }}>{m.value}</span>
                </div>
              )
            })}
          </div>
     {/* フォントサイズ設定セクション（スライダー版） */}
     <div
  style={{
    padding: '12px 16px',
    background: '#fafafa',
  }}
  data-slider-container="true"
  onClick={(e) => e.stopPropagation()}
  onMouseDown={(e) => e.stopPropagation()}
  onMouseUp={(e) => e.stopPropagation()}
>
  <div
    style={{
      fontSize: '13px',
      color: '#666',
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    <span>フォントサイズ:</span>
    <span
      style={{
        fontWeight: 'bold',
        color: '#333',
        fontSize: '14px',
      }}
    >
      {(() => {
        const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
        const fontSize = tempFontSize ?? currentBox?.fontSize
        return fontSize ? `${fontSize}px` : '自動'
      })()}
    </span>
  </div>

  {/* 自動/手動切り替えボタン */}
  <div style={{ marginBottom: '10px' }}>
  <button
  onClick={(e) => {
    e.stopPropagation()
    e.preventDefault() // 追加：デフォルト動作を防ぐ
    const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
    if (currentBox) {
      if (currentBox.fontSize === undefined) {
        // 自動→手動に切り替え
        const isVertical = currentBox.height > currentBox.width * 1.5
        const formattedValue = formatValue(currentBox.value, currentBox.decimalPlaces)
        const calculatedSize = calculateOptimalFontSize(
          formattedValue || '0',
          currentBox.width,
          currentBox.height,
          isVertical
        )
        changeFontSize(currentBox.id, calculatedSize)
        setTempFontSize(calculatedSize)
      } else {
        // 手動→自動に切り替え
        changeFontSize(currentBox.id, undefined)
        setTempFontSize(null)
      }
    }
    return false // 追加：イベントの伝播を完全に停止
  }}
  onMouseDown={(e) => {
    e.stopPropagation()
    e.preventDefault()
  }}
      style={{
        width: '100%',
        padding: '6px',
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        marginBottom: '8px',
      }}
    >
      {(() => {
        const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
        return currentBox?.fontSize === undefined 
          ? '🔄 手動調整に切り替え' 
          : '🔄 自動調整に戻す'
      })()}
    </button>
  </div>

  {/* スライダー（手動モードの時のみ有効） */}
  <div style={{ position: 'relative' }}>
    <input
      type="range"
      min="1"
      max="100"
      step="1"
      value={(() => {
        const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
        
        // tempFontSizeがある場合はそれを使用
        if (tempFontSize !== null) return tempFontSize
        
        // fontSizeが設定されている場合はそれを使用
        if (currentBox?.fontSize !== undefined) return currentBox.fontSize
        
        // それ以外は現在の計算値を使用
        if (currentBox) {
          const isVertical = currentBox.height > currentBox.width * 1.5
          const formattedValue = formatValue(currentBox.value, currentBox.decimalPlaces)
          return calculateOptimalFontSize(
            formattedValue || '0',
            currentBox.width,
            currentBox.height,
            isVertical
          )
        }
        
        return 14 // デフォルト値
      })()}
      onChange={(e) => {
        e.stopPropagation()
        const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
        const newSize = parseInt(e.target.value)
        
        if (currentBox?.fontSize === undefined) {
          // 自動モードから手動モードに切り替え
          changeFontSize(contextMenu.boxId!, newSize)
        } else {
          // 既に手動モードの場合
          changeFontSize(contextMenu.boxId!, newSize)
        }
        setTempFontSize(newSize)
      }}
      disabled={(() => {
        const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
        return currentBox?.fontSize === undefined // 自動モードの時は無効
      })()}
      onMouseDown={(e) => {
        e.stopPropagation()
        setIsSliderDragging(true)
      }}
      onMouseUp={(e) => {
        e.stopPropagation()
        setIsSliderDragging(false)
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        setIsSliderDragging(true)
      }}
      onTouchEnd={(e) => {
        e.stopPropagation()
        setIsSliderDragging(false)
      }}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        height: '6px',
        background: 'transparent',
        outline: 'none',
        cursor: (() => {
          const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
          return currentBox?.fontSize === undefined ? 'not-allowed' : 'pointer'
        })(),
        opacity: (() => {
          const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
          return currentBox?.fontSize === undefined ? 0.5 : 1
        })(),
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        appearance: 'none',
        position: 'relative',
        zIndex: 10,
      }}
    />
        {/* カスタムスライダートラック */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '4px',
            background: '#e0e0e0',
            borderRadius: '2px',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '2px',
              width: `${(() => {
                const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
                const fontSize = tempFontSize ?? currentBox?.fontSize ?? 14
                return ((fontSize - 1) / (101 - 1)) * 100
              })()}%`,
            }}
          />
        </div>
      </div>
    </div>

          {/* 既存の小数点設定 */}
          <div
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              color: '#666',
              borderBottom: '1px solid #e0e0e0',
              background: '#fafafa',
            }}
          >
            小数点桁数を選択:
          </div>
          {[0, 1, 2, 3, 4].map((places) => {
            const currentBox = boxes.find((b) => b.id === contextMenu.boxId)
            const isCurrentSetting = currentBox?.decimalPlaces === places

            return (
              <div
                key={places}
                style={{
                  ...styles.contextMenuItem,
                  background: isCurrentSetting ? '#e3f2fd' : 'transparent',
                  fontWeight: isCurrentSetting ? 'bold' : 'normal',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isCurrentSetting ? '#e3f2fd' : 'transparent'
                }}
                onClick={() => contextMenu.boxId && changeDecimalPlaces(contextMenu.boxId, places)}
              >
                <span>{places}桁表示</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {currentBox?.value && (
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      → {formatValue(currentBox.value, places)}
                    </span>
                  )}
                  {isCurrentSetting && <span style={{ color: '#667eea' }}>✔</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* SaveDialogコンポーネント（外部に移動済み） */}
      <SaveDialog
        showSaveDialog={showSaveDialog}
        setShowSaveDialog={setShowSaveDialog}
        saveFileName={saveFileName}
        setSaveFileName={setSaveFileName}
        isSaving={isSaving}
        performSave={performSave}
      />
    </div>
  )
}

export default MeasurementPage
