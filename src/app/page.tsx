'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import html2canvas from 'html2canvas'

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

const MeasurementPage = () => {
  // State管理
  const [boxes, setBoxes] = useState<Box[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [drawingImage, setDrawingImage] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentBox, setCurrentBox] = useState<Box | null>(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [drawMode, setDrawMode] = useState(true)
  const [selectedBox, setSelectedBox] = useState<number | null>(null)
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
    boxId: null
  })
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0
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
              (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
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
    const baseWidth = minSize < 20 ? 1 : minSize < 50 ? 1.5 : 2
    const scaledWidth = baseWidth / Math.max(1, scale / 2)
    return Math.max(0.5, scaledWidth)
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
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!canvasRef.current || drawMode) return
    e.preventDefault()
    
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(viewTransform.scale * scaleFactor, 0.5), 1000)
    
    const scaleChange = newScale - viewTransform.scale
    const newTranslateX = viewTransform.translateX - mouseX * scaleChange / newScale
    const newTranslateY = viewTransform.translateY - mouseY * scaleChange / newScale
    
    setViewTransform({
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY
    })
  }, [drawMode, viewTransform])

  // ホイールイベントリスナー
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false })
      return () => canvas.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // 動的なフォントサイズ計算
  const calculateOptimalFontSize = (text: string, boxWidth: number, boxHeight: number, isVertical: boolean): number => {
    const padding = 4
    const availableWidth = boxWidth - padding * 2
    const availableHeight = boxHeight - padding * 2
    
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
      setBoxes(prev => prev.map(box => 
        box.id === editingBoxId 
          ? { ...box, value: editingValue, isManuallyEdited: true }
          : box
      ))
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
      
      setViewTransform(prev => ({
        ...prev,
        translateX: prev.translateX + dx,
        translateY: prev.translateY + dy
      }))
      
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  // パン終了
  const handlePanEnd = () => {
    setIsPanning(false)
  }

  // 右クリックメニュー表示
  const handleContextMenu = (e: React.MouseEvent, boxId: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      boxId
    })
  }

  // 右クリックメニュー非表示
  const hideContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, boxId: null })
  }

  // 桁数変更
  const changeDecimalPlaces = (boxId: number, decimalPlaces: number) => {
    setBoxes(prev => prev.map(box => {
      if (box.id === boxId) {
        if (box.value) {
          const numValue = parseFloat(box.value)
          if (!isNaN(numValue)) {
            return { 
              ...box, 
              decimalPlaces,
              value: box.value
            }
          }
        }
        return { ...box, decimalPlaces }
      }
      return box
    }))
    hideContextMenu()
  }

  // すべてのボックスの桁数を一括変更
  const changeAllDecimalPlaces = (decimalPlaces: number) => {
    setBoxes(prev => prev.map(box => ({
      ...box,
      decimalPlaces
    })))
    setDefaultDecimalPlaces(decimalPlaces)
  }

  // 改良版PDFテキスト抽出（ZEISS形式対応修正版）
  const extractMeasurementsFromPDF = async (file: File) => {
    try {
      setPdfLoadError(null)
      
      // PDF.jsの読み込み待機
      let retryCount = 0
      while (!(window as any).pdfjsLib && retryCount < 10) {
        await new Promise(resolve => setTimeout(resolve, 300))
        retryCount++
      }
      
      if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
        const pdfjsLib = (window as any).pdfjsLib
        console.log('PDF.js is ready, starting extraction...')
        
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ 
          data: arrayBuffer,
          useSystemFonts: true,
          standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/'
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
            const rowText = row.map((item: any) => item.str).join(' ').trim()
            if (rowText.includes('ZEISS CALYPSO') || (rowText.includes('測定値') && rowText.includes('設計値'))) {
              isZeissFormat = true
              console.log('ZEISS形式を検出しました')
              break
            }
          }
          
          // 測定データの抽出（修正版）
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowItems = row.map((item: any) => item.str.trim()).filter((s: string) => s.length > 0)
            const rowText = rowItems.join(' ')
            
  // ZEISS形式のPDF処理部分の修正版
// page.tsxの1094行目付近の if (isZeissFormat) { ... } ブロックを以下に置き換えてください

if (isZeissFormat) {
  // ZEISS形式の新しいパターン（改善版）
  if (rowItems.length >= 2) {
    // 測定値を探す（数値パターンにマッチするものを探す）
    let measuredValueIndex = -1
    let measuredValue = null
    let unitFound = 'mm'
    
    // 数値パターンを持つ要素を探す
    for (let j = 0; j < rowItems.length; j++) {
      const item = rowItems[j].replace(/\s*mm\s*$/, '')
      
      // 測定値のパターン（小数点を含む数値）
      if (/^[-]?\d+\.\d{3,4}$/.test(item)) {
        measuredValue = item
        measuredValueIndex = j
        // 次の要素が単位かチェック
        if (j + 1 < rowItems.length && rowItems[j + 1] === 'mm') {
          unitFound = 'mm'
        }
        break
      }
    }
    
    // 測定値が見つかった場合、名前を構築
    if (measuredValue && measuredValueIndex > 0) {
      // 測定値より前のすべての要素を結合して名前を作成
      let nameParts = []
      for (let k = 0; k < measuredValueIndex; k++) {
        const part = rowItems[k].trim()
        // ヘッダー行や不要な要素を除外
        if (part && 
            part !== '名前' && 
            part !== '測定値' && 
            part !== '設計値' && 
            part !== '公差(+)' && 
            part !== '公差(-)' && 
            part !== '誤差' &&
            part !== '+/-') {
          nameParts.push(part)
        }
      }
      
      // 名前を結合（特殊文字の処理）
      let name = nameParts.join('')
      
      // 一般的なZEISS形式のパターンを修正
      // "X-" "値円1_6H7" -> "X-値円1_6H7"
      // "平面度" "1" -> "平面度1"
      if (name.endsWith('-') && nameParts.length > 1) {
        // ハイフンで終わる場合は次の要素と結合されている可能性が高い
        name = nameParts.join('')
      } else if (nameParts.length === 2 && /^[A-Za-z]+-?$/.test(nameParts[0])) {
        // "X-" や "Y-" のようなパターン
        name = nameParts.join('')
      } else if (nameParts.length === 2 && /^\d+$/.test(nameParts[1])) {
        // "平面度" "1" のようなパターン
        name = nameParts.join('')
      }
      
      if (name && measuredValue) {
        const exists = extractedMeasurements.some(m => 
          m.name === name && m.value === measuredValue
        )
        
        if (!exists) {
          extractedMeasurements.push({
            name: name,
            value: measuredValue,
            unit: unitFound
          })
          console.log(`ZEISS形式（改善版）: ${name} = ${measuredValue} ${unitFound}`)
        }
      }
    }
  }
}else {
              // Calypso形式のパターン（既存のまま）
              const calypsoPatterns = [
                /^(.+?)\s+([-]?\d+\.\d{4})\s+([-]?\d+\.\d{4})\s+/,
                /^([A-Za-z_\-]+[\d_]*(?:_[A-Za-z0-9]+)*)\s+([-]?\d+\.\d{4})\s+/,
                /^(平面度\d*|同心度\d*|真円度[^\s]*|直径[^\s]*)\s+([-]?\d+\.\d{4})\s+/
              ]
              
              for (const pattern of calypsoPatterns) {
                const match = rowText.match(pattern)
                if (match) {
                  const name = match[1].trim()
                  const value = match[2]
                  
                  const exists = extractedMeasurements.some(m => 
                    m.name === name && m.value === value
                  )
                  
                  if (!exists && !name.includes('設計値') && !name.includes('公差')) {
                    extractedMeasurements.push({
                      name: name,
                      value: value,
                      unit: 'mm'
                    })
                    console.log(`Calypso形式: ${name} = ${value} mm`)
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

  // 図面アップロード処理
  const handleDrawingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setDrawingImage(e.target?.result as string)
        setViewTransform({ scale: 1, translateX: 0, translateY: 0 })
      }
      reader.readAsDataURL(file)
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
    
    setIsDrawing(true)
    setStartPos(canvasPos)
    setCurrentBox({
      id: Date.now(),
      x: canvasPos.x,
      y: canvasPos.y,
      width: 0,
      height: 0,
      value: null,
      index: boxes.length,
      decimalPlaces: defaultDecimalPlaces
    })
  }

  // マウス移動処理
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e || typeof e.preventDefault !== 'function') {
      return
    }
    
    e.preventDefault()
    
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
        const box = boxes.find(b => b.id === hoveredBox)
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
    
    setCurrentBox(prev => prev ? {
      ...prev,
      x,
      y,
      width,
      height
    } : null)
  }

  // マウスアップ処理（修正版）
  const handleMouseUp = (e?: React.MouseEvent<HTMLDivElement>) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }
    
    if (isPanning) {
      handlePanEnd()
      return
    }
    
    if (!isDrawing || !currentBox) return
    
    setIsDrawing(false)
    
    if (currentBox.width > minBoxSize && currentBox.height > minBoxSize) {
      setBoxes(prev => [...prev, currentBox])
    }
    
    setCurrentBox(null)
  }

  // 測定値自動転記
  const autoAssignValues = () => {
    const updatedBoxes = boxes.map((box, index) => {
      if (box.isManuallyEdited) {
        return box
      }
      if (measurements[index]) {
        return {
          ...box,
          value: measurements[index].value
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

  // 結果を保存
  const exportResult = async () => {
    if (canvasRef.current) {
      try {
        setHoveredBox(null)
        hideContextMenu()
        setEditingBoxId(null)
        
        const tempTransform = viewTransform
        setViewTransform({ scale: 1, translateX: 0, translateY: 0 })
        
        const tempShowNumbers = showBoxNumbers
        const tempShowDelete = showDeleteButtons
        setShowBoxNumbers(false)
        setShowDeleteButtons(false)
        
        setTimeout(async () => {
          const canvas = await html2canvas(canvasRef.current!, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: 'white'
          })
          const link = document.createElement('a')
          link.download = `measurement_result_${new Date().getTime()}.png`
          link.href = canvas.toDataURL()
          link.click()
          
          setViewTransform(tempTransform)
          setShowBoxNumbers(tempShowNumbers)
          setShowDeleteButtons(tempShowDelete)
        }, 100)
      } catch (error) {
        console.error('保存エラー:', error)
        alert('画像の保存に失敗しました。')
      }
    }
  }

  // ボックス削除
  const deleteBox = (boxId: number) => {
    setBoxes(prev => prev.filter(box => box.id !== boxId))
  }

  // スタイル定義
  const styles = {
    container: {
      fontFamily: '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '20px'
    },
    mainContainer: {
      maxWidth: '1400px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    },
    header: {
      background: 'linear-gradient(135deg, #DDDDDD 10%, #888888 100%)',
      color: 'white',
      padding: '20px',
      textAlign: 'center' as const,
      position: 'relative' as const
    },
    controls: {
      padding: '20px',
      background: '#f8f9fa',
      borderBottom: '2px solid #e9ecef',
      display: 'flex',
      gap: '15px',
      flexWrap: 'wrap' as const,
      alignItems: 'center'
    },
    uploadBtn: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '25px',
      cursor: 'pointer',
      fontWeight: '600',
      fontFamily: '"Noto Sans JP", sans-serif'
    },
    actionBtn: (active: boolean) => ({
      padding: '8px 16px',
      borderRadius: '20px',
      border: '2px solid #667eea',
      background: active ? '#667eea' : 'white',
      color: active ? 'white' : '#667eea',
      cursor: 'pointer',
      fontWeight: '600',
      fontFamily: '"Noto Sans JP", sans-serif'
    }),
    mainContent: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      padding: '20px'
    },
    panel: {
      background: '#f8f9fa',
      borderRadius: '15px',
      padding: '20px'
    },
    canvasContainer: {
      position: 'relative' as const,
      width: '100%',
      height: '500px',
      background: 'white',
      border: '2px solid #e9ecef',
      borderRadius: '10px',
      overflow: 'hidden',
      cursor: drawMode ? 'crosshair' : isPanning ? 'grabbing' : 'grab',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      MozUserSelect: 'none' as const,
      msUserSelect: 'none' as const
    },
    transformContainer: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      transform: `scale(${viewTransform.scale}) translate(${viewTransform.translateX / viewTransform.scale}px, ${viewTransform.translateY / viewTransform.scale}px)`,
      transformOrigin: '0 0',
      transition: isPanning ? 'none' : 'transform 0.2s ease'
    },
    image: {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain' as const,
      pointerEvents: 'none' as const,
      userSelect: 'none' as const,
      WebkitUserDrag: 'none' as const,
      MozUserDrag: 'none' as const,
      userDrag: 'none' as const
    },
    box: (isVertical: boolean, fontSize: number, textColor: string, isEditing: boolean, borderWidth: number) => ({
      position: 'absolute' as const,
      border: isEditing 
        ? `${Math.max(2, borderWidth)}px solid #00ff00` 
        : textColor === 'white' 
          ? `${borderWidth}px solid #ffffff` 
          : `${borderWidth}px solid #ff6b6b`,
      background: isEditing
        ? 'rgba(0, 255, 0, 0.1)'
        : textColor === 'white' 
          ? 'rgba(0, 0, 0, 0.7)' 
          : 'rgba(255, 107, 107, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: drawMode ? 'default' : 'move',
      writingMode: isVertical ? ('vertical-rl' as const) : ('horizontal-tb' as const),
      textOrientation: isVertical ? ('upright' as const) : ('mixed' as const),
      userSelect: 'none' as const,
      fontSize: `${fontSize}px`,
      fontFamily: '"Noto Sans JP", sans-serif'
    }),
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
      display: showBoxNumbers ? 'block' : 'none'
    }),
    boxValue: (textColor: string) => ({
      fontWeight: 'bold' as const,
      color: textColor === 'white' ? '#ffffff' : '#333333',
      padding: '2px',
      fontFamily: '"Noto Sans JP", sans-serif'
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
      fontFamily: '"Noto Sans JP", sans-serif'
    },
    measurementList: {
      background: 'white',
      border: '2px solid #e9ecef',
      borderRadius: '10px',
      padding: '15px',
      maxHeight: '400px',
      overflowY: 'auto' as const
    },
    measurementItem: (assigned: boolean, outOfTolerance?: boolean) => ({
      padding: '8px',
      margin: '5px 0',
      background: assigned ? '#d4edda' : outOfTolerance ? '#f8d7da' : '#f8f9fa',
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '14px',
      fontFamily: '"Noto Sans JP", sans-serif'
    }),
    deleteBtn: (textColor: string, scaledSize: number) => ({
      position: 'absolute' as const,
      top: `${scaledSize * 0.3}px`,
      right: `${scaledSize * 0.3}px`,
      background: textColor === 'white' ? 'rgba(255,255,255,0.9)' : 'white',
      border: textColor === 'white' 
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
      fontFamily: '"Noto Sans JP", sans-serif'
    }),
    errorMessage: {
      background: '#f8d7da',
      color: '#721c24',
      padding: '10px',
      borderRadius: '5px',
      marginTop: '10px'
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
      fontFamily: '"Noto Sans JP", sans-serif'
    },
    contextMenu: {
      position: 'fixed' as const,
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      padding: '8px 0',
      zIndex: 2000,
      minWidth: '200px'
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
      fontFamily: '"Noto Sans JP", sans-serif'
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
      fontFamily: '"Noto Sans JP", sans-serif'
    },
    decimalControl: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '5px 10px',
      background: '#f0f0f0',
      borderRadius: '15px'
    }
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
    const handleClick = () => hideContextMenu()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.mainContainer}>
        <div style={styles.header}>
          <h1>📊 図面測定値転記システム (ZEISS対応版)</h1>
          <p>CalypsoとZEISS両形式のPDFに対応</p>
        </div>
        
        <div style={styles.controls}>
          <label>
            <input
              type="file"
              accept="image/*"
              onChange={handleDrawingUpload}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            <button 
              style={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              🖼 図面をアップロード
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
            <button 
              style={styles.uploadBtn}
              onClick={() => pdfInputRef.current?.click()}
            >
              📄 測定結果PDFをアップロード
            </button>
          </label>
          
          <button
            style={styles.actionBtn(drawMode)}
            onClick={() => setDrawMode(!drawMode)}
          >
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
          
          <button
            style={styles.actionBtn(false)}
            onClick={clearBoxes}
          >
            🗑️ ボックスをクリア
          </button>
          
          <button
            style={styles.actionBtn(false)}
            onClick={autoAssignValues}
            disabled={!pdfLoaded || boxes.length === 0}
          >
            🔄 測定値を自動転記
          </button>
          
          <button
            style={styles.actionBtn(textColorMode === 'white')}
            onClick={() => setTextColorMode(prev => prev === 'black' ? 'white' : 'black')}
            title="文字色を切り替え"
          >
            {textColorMode === 'black' ? '⚫' : '⚪'} 文字色
          </button>
          
          <button
            style={styles.actionBtn(false)}
            onClick={resetView}
          >
            🔄 表示リセット
          </button>
          
          <button
            style={styles.actionBtn(false)}
            onClick={exportResult}
          >
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
              style={{ width: '50px', padding: '2px 5px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            <button
              onClick={() => changeAllDecimalPlaces(defaultDecimalPlaces)}
              style={{ 
                padding: '2px 8px', 
                background: '#667eea', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              一括適用
            </button>
          </div>
          
          <div style={styles.decimalControl}>
            <span>最小ボックス:</span>
            <input
              type="number"
              min="3"
              max="20"
              value={minBoxSize}
              onChange={(e) => setMinBoxSize(parseInt(e.target.value) || 3)}
              style={{ width: '50px', padding: '2px 5px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            <span>px</span>
          </div>
          
          <div style={styles.decimalControl}>
            <span>最小フォント:</span>
            <input
              type="number"
              min="1"
              max="6"
              value={minFontSize}
              onChange={(e) => setMinFontSize(parseInt(e.target.value) || 1)}
              style={{ width: '50px', padding: '2px 5px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            <span>px</span>
          </div>
        </div>
        
        <div style={styles.mainContent}>
          <div style={styles.panel}>
            <h3>🖼 図面（ズーム: {Math.round(viewTransform.scale * 100)}%）</h3>
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
                  <img 
                    src={drawingImage} 
                    style={styles.image} 
                    alt="Drawing"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                )}
                
                {/* 作成済みボックス */}
                {boxes.map((box) => {
                  const isVertical = box.height > box.width * 1.5
                  const formattedValue = formatValue(box.value, box.decimalPlaces)
                  const fontSize = box.value 
                    ? calculateOptimalFontSize(formattedValue, box.width, box.height, isVertical)
                    : 14
                  const isEditing = editingBoxId === box.id
                  
                  const borderWidth = calculateBorderWidth(box.width, box.height, viewTransform.scale)
                  const scaledNumberSize = getScaledElementSize(14, viewTransform.scale)
                  const scaledDeleteBtnSize = getScaledElementSize(16, viewTransform.scale)
                  
                  return (
                    <div
                      key={box.id}
                      style={{
                        ...styles.box(isVertical, fontSize, textColorMode, isEditing, borderWidth),
                        left: `${box.x}px`,
                        top: `${box.y}px`,
                        width: `${box.width}px`,
                        height: `${box.height}px`
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onContextMenu={(e) => handleContextMenu(e, box.id)}
                      onDoubleClick={() => handleBoxDoubleClick(box)}
                      onMouseEnter={(e) => {
                        if (box.value && !isEditing) {
                          setHoveredBox(box.id)
                          if (canvasRef.current) {
                            const rect = canvasRef.current.getBoundingClientRect()
                            const boxRect = e.currentTarget.getBoundingClientRect()
                            const x = (boxRect.left - rect.left + box.width / 2) * viewTransform.scale
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
                          <span style={styles.boxValue(textColorMode)}>
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
                        calculateBorderWidth(currentBox.width, currentBox.height, viewTransform.scale)
                      ),
                      left: `${currentBox.x}px`,
                      top: `${currentBox.y}px`,
                      width: `${currentBox.width}px`,
                      height: `${currentBox.height}px`,
                      opacity: 0.5
                    }}
                  >
                    <span style={{ 
                      fontSize: `${getScaledElementSize(10, viewTransform.scale)}px`, 
                      opacity: 0.7 
                    }}>
                      {Math.round(currentBox.width)}×{Math.round(currentBox.height)}px
                    </span>
                  </div>
                )}
              </div>
              
              {/* ツールチップ */}
              {hoveredBox !== null && (
                (() => {
                  const box = boxes.find(b => b.id === hoveredBox)
                  if (!box || !box.value) return null
                  const measurement = measurements[box.index]
                  
                  return (
                    <div
                      style={{
                        ...styles.tooltip,
                        left: `${tooltipPosition.x}px`,
                        top: `${tooltipPosition.y}px`
                      }}
                    >
                      <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                        #{box.index + 1} {measurement?.name || '（手動入力）'}
                      </div>
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
                })()
              )}
              
              {/* ズーム情報 */}
              {(viewTransform.scale !== 1 || currentBox) && (
                <div style={styles.zoomInfo}>
                  ズーム: {Math.round(viewTransform.scale * 100)}%
                  {currentBox && ` | 作成中: ${Math.round(currentBox.width)}×${Math.round(currentBox.height)}px`}
                </div>
              )}
            </div>
          </div>
          
          <div style={styles.panel}>
            <h3>📋 測定結果</h3>
            {pdfLoadError && (
              <div style={styles.errorMessage}>
                ⚠️ {pdfLoadError}
              </div>
            )}
            <div style={styles.measurementList}>
              {measurements.length === 0 ? (
                <p style={{ color: '#999' }}>
                  PDFをアップロードすると測定値が表示されます<br/>
                  <small>※Calypso/ZEISS両形式対応</small>
                </p>
              ) : (
                measurements.map((m, index) => {
                  const box = boxes.find(b => b.index === index)
                  const isAssigned = !!box?.value
                  const isManuallyEdited = box?.isManuallyEdited
                  
                  return (
                    <div 
                      key={index} 
                      style={styles.measurementItem(isAssigned, m.isOutOfTolerance)}
                    >
                      <span style={{ flex: 1 }}>
                        {index + 1}. {m.name}
                        {isManuallyEdited && ' ✏️'}
                      </span>
                      <strong style={{ color: m.isOutOfTolerance ? '#dc3545' : 'inherit' }}>
                        {m.value} {m.unit}
                      </strong>
                    </div>
                  )
                })
              )}
            </div>
            
            <div style={{ marginTop: '20px', padding: '10px', background: '#e9ecef', borderRadius: '10px' }}>
              <p>📊 ステータス</p>
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                <span>ボックス数: <strong>{boxes.length}</strong></span>
                <span>測定値数: <strong>{measurements.length}</strong></span>
                <span>転記済み: <strong>{boxes.filter(b => b.value).length}</strong></span>
                <span>手動編集: <strong>{boxes.filter(b => b.isManuallyEdited).length}</strong></span>
                <span>ズーム: <strong>{Math.round(viewTransform.scale * 100)}%</strong></span>
                <span>最小サイズ: <strong>{minBoxSize}px</strong></span>
                <span>最小フォント: <strong>{minFontSize}px</strong></span>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                💡 <strong>使い方ガイド:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  <li><strong>ダブルクリック</strong>: 値を手動編集</li>
                  <li><strong>右クリック</strong>: 小数点桁数を変更</li>
                  <li><strong>移動モード + マウスホイール</strong>: ズーム（最大1000倍）</li>
                  <li><strong>移動モード + ドラッグ</strong>: 画面移動</li>
                  <li><strong>Calypso/ZEISS形式</strong>: 両方のPDF形式に対応</li>
                  <li><strong>✏️マーク</strong>: 手動編集されたボックス</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 右クリックメニュー */}
      {contextMenu.visible && (
        <div
          style={{
            ...styles.contextMenu,
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '8px 16px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0', background: '#f5f5f5' }}>
            🔢 ボックス設定
          </div>
          <div style={{ padding: '8px 16px', fontSize: '13px', color: '#666', borderBottom: '1px solid #e0e0e0' }}>
            小数点桁数を選択:
          </div>
          {[0, 1, 2, 3, 4].map(places => {
            const currentBox = boxes.find(b => b.id === contextMenu.boxId)
            const isCurrentSetting = currentBox?.decimalPlaces === places
            
            return (
              <div
                key={places}
                style={{
                  ...styles.contextMenuItem,
                  background: isCurrentSetting ? '#e3f2fd' : 'transparent',
                  fontWeight: isCurrentSetting ? 'bold' : 'normal'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
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
    </div>
  )
}

export default MeasurementPage