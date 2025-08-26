'use client'

import React, { useState, useRef, useEffect } from 'react'
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
}

interface Measurement {
  name: string
  value: string
  unit: string
  error?: string
  isOutOfTolerance?: boolean
}

const MeasurementPage = () => {
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
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // PDF.jsの動的インポート（エラー対策）
  useEffect(() => {
    // PDF.jsをクライアントサイドでのみロード
    if (typeof window !== 'undefined') {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.async = true
      document.body.appendChild(script)

      const workerScript = document.createElement('script')
      workerScript.innerHTML = `
        if (typeof pdfjsLib !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      `
      document.body.appendChild(workerScript)

      return () => {
        document.body.removeChild(script)
        document.body.removeChild(workerScript)
      }
    }
  }, [])

  // PDFテキスト抽出（シンプル版 - PDF.js不要）
  const extractMeasurementsFromPDF = async (file: File) => {
    try {
      setPdfLoadError(null)
      
      // PDF.jsが利用可能か確認
      if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
        const pdfjsLib = (window as any).pdfjsLib
        
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ 
          data: arrayBuffer,
          useSystemFonts: true 
        }).promise
        
        const extractedMeasurements: Measurement[] = []
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum)
          const textContent = await page.getTextContent()
          const textItems = textContent.items as any[]
          
          // テキスト全体を結合
          let fullText = ''
          textItems.forEach((item: any) => {
            fullText += item.str + ' '
          })
          
          console.log('抽出されたテキスト（ページ' + pageNum + '）:', fullText.substring(0, 500))
          
          // 測定値パターンの検出
          const patterns = [
            // 基本パターン: 名前 数値 mm
            /([^\d\s][^\s]*?)\s+([\d.-]+)\s+mm/g,
            // 詳細パターン
            /([^\s]+)\s+([\d.-]+)\s+mm\s+([\d.-]+)/g,
          ]
          
          for (const pattern of patterns) {
            let match
            const regex = new RegExp(pattern)
            while ((match = regex.exec(fullText)) !== null) {
              const exists = extractedMeasurements.some(m => 
                m.name === match[1] && m.value === match[2]
              )
              
              if (!exists && !match[1].match(/^\d/)) { // 数字で始まる名前は除外
                extractedMeasurements.push({
                  name: match[1].trim(),
                  value: match[2],
                  unit: 'mm'
                })
              }
            }
          }
        }
        
        if (extractedMeasurements.length > 0) {
          setMeasurements(extractedMeasurements)
          setPdfLoaded(true)
          alert(`${extractedMeasurements.length}個の測定値を抽出しました。`)
        } else {
          throw new Error('測定値が見つかりませんでした')
        }
        
      } else {
        // PDF.jsが利用できない場合はデモデータを使用
        throw new Error('PDF.jsがロードされていません')
      }
      
    } catch (error) {
      console.error('PDF解析エラー:', error)
      setPdfLoadError('PDFの解析に失敗しました。デモデータを使用します。')
      
      // デモデータ（ZEISS CALYPSOのサンプルデータ）
      const demoData: Measurement[] = [
        { name: '平面度1', value: '0.0392', unit: 'mm' },
        { name: 'X-値円1_6H7', value: '12.5385', unit: 'mm' },
        { name: 'Y-値円1_6H7', value: '190.0109', unit: 'mm' },
        { name: '直径円1_6H7', value: '6.0188', unit: 'mm' },
        { name: '真円度円1_6H7', value: '0.0015', unit: 'mm' },
        { name: '同心度3', value: '0.0706', unit: 'mm' },
        { name: '直径円16', value: '15.9222', unit: 'mm' },
        { name: 'X-値長穴1_6H7_14', value: '12.5202', unit: 'mm' },
        { name: '距離1_Y', value: '599.9912', unit: 'mm' },
        { name: '長さ長穴1_6H7_14', value: '13.9831', unit: 'mm' },
        { name: '幅長穴1_6H7_14', value: '5.9969', unit: 'mm' },
        { name: 'X-値円1_9', value: '-0.0101', unit: 'mm' },
        { name: 'Y-値円1_9', value: '-181.9853', unit: 'mm' },
        { name: '直径円1_9', value: '9.0200', unit: 'mm' },
        { name: '同心度1', value: '0.0613', unit: 'mm' }
      ]
      
      setMeasurements(demoData)
      setPdfLoaded(true)
      
      setTimeout(() => {
        alert('PDFの解析に失敗したため、デモデータ（15個の測定値）を使用します。')
      }, 100)
    }
  }

  // 図面アップロード処理
  const handleDrawingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setDrawingImage(e.target?.result as string)
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

  // マウスダウン処理
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!drawMode || !drawingImage || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setIsDrawing(true)
    setStartPos({ x, y })
    setCurrentBox({
      id: Date.now(),
      x,
      y,
      width: 0,
      height: 0,
      value: null,
      index: boxes.length
    })
  }

  // マウス移動処理
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    
    if (!isDrawing || !currentBox || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top
    
    const width = Math.abs(currentX - startPos.x)
    const height = Math.abs(currentY - startPos.y)
    const x = Math.min(startPos.x, currentX)
    const y = Math.min(startPos.y, currentY)
    
    setCurrentBox(prev => prev ? {
      ...prev,
      x,
      y,
      width,
      height
    } : null)
  }

  // マウスアップ処理
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    
    if (!isDrawing || !currentBox) return
    
    setIsDrawing(false)
    
    if (currentBox.width > 10 && currentBox.height > 10) {
      setBoxes(prev => [...prev, currentBox])
    }
    
    setCurrentBox(null)
  }

  // 測定値自動転記
  const autoAssignValues = () => {
    const updatedBoxes = boxes.map((box, index) => {
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
    setBoxes([])
  }

  // 結果を保存
  const exportResult = async () => {
    if (canvasRef.current) {
      try {
        const canvas = await html2canvas(canvasRef.current, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: 'white'
        })
        const link = document.createElement('a')
        link.download = `measurement_result_${new Date().getTime()}.png`
        link.href = canvas.toDataURL()
        link.click()
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

  // ホームに戻るボタン
  const goToHome = () => {
    window.location.href = '/'
  }

  // スタイル定義
  const styles = {
    container: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '20px',
      textAlign: 'center' as const,
      position: 'relative' as const
    },
    homeButton: {
      position: 'absolute' as const,
      left: '20px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'rgba(255,255,255,0.2)',
      border: '2px solid white',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      cursor: 'pointer',
      fontWeight: 'bold' as const
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
      fontWeight: '600'
    },
    actionBtn: (active: boolean) => ({
      padding: '8px 16px',
      borderRadius: '20px',
      border: '2px solid #667eea',
      background: active ? '#667eea' : 'white',
      color: active ? 'white' : '#667eea',
      cursor: 'pointer',
      fontWeight: '600'
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
      cursor: drawMode ? 'crosshair' : 'default',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      MozUserSelect: 'none' as const,
      msUserSelect: 'none' as const
    },
    image: {
      position: 'absolute' as const,
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain' as const,
      pointerEvents: 'none' as const,
      userSelect: 'none' as const,
      WebkitUserDrag: 'none' as const,
      MozUserDrag: 'none' as const,
      userDrag: 'none' as const
    },
    box: (isVertical: boolean) => ({
      position: 'absolute' as const,
      border: '2px solid #ff6b6b',
      background: 'rgba(255, 107, 107, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'move',
      writingMode: isVertical ? ('vertical-rl' as const) : ('horizontal-tb' as const),
      textOrientation: isVertical ? ('upright' as const) : ('mixed' as const),
      userSelect: 'none' as const
    }),
    boxNumber: {
      position: 'absolute' as const,
      top: '-25px',
      left: '0',
      background: '#ff6b6b',
      color: 'white',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold' as const,
      writingMode: 'horizontal-tb' as const
    },
    boxValue: {
      fontWeight: 'bold' as const,
      color: '#333',
      fontSize: '14px'
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
      justifyContent: 'space-between'
    }),
    deleteBtn: {
      position: 'absolute' as const,
      top: '5px',
      right: '5px',
      background: 'white',
      border: '1px solid #ff6b6b',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      color: '#ff6b6b'
    },
    errorMessage: {
      background: '#f8d7da',
      color: '#721c24',
      padding: '10px',
      borderRadius: '5px',
      marginTop: '10px'
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

  return (
    <div style={styles.container}>
      <div style={styles.mainContainer}>
        <div style={styles.header}>
          <button style={styles.homeButton} onClick={goToHome}>
            ← ホーム
          </button>
          <h1>🔧 図面測定値転記システム</h1>
          <p>図面上にボックスを作成して、測定結果を自動転記します</p>
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
              📊 図面をアップロード
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
            ✏️ ボックス作成モード
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
            style={styles.actionBtn(false)}
            onClick={exportResult}
          >
            💾 結果を保存
          </button>
        </div>
        
        <div style={styles.mainContent}>
          <div style={styles.panel}>
            <h3>📐 図面</h3>
            <div
              ref={canvasRef}
              style={styles.canvasContainer}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDragStart={(e) => e.preventDefault()}
            >
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
                return (
                  <div
                    key={box.id}
                    style={{
                      ...styles.box(isVertical),
                      left: `${box.x}px`,
                      top: `${box.y}px`,
                      width: `${box.width}px`,
                      height: `${box.height}px`
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <span style={styles.boxNumber}>{box.index + 1}</span>
                    {box.value && (
                      <span style={styles.boxValue}>
                        {box.value}
                      </span>
                    )}
                    {!drawMode && (
                      <button
                        style={styles.deleteBtn}
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
                    ...styles.box(currentBox.height > currentBox.width * 1.5),
                    left: `${currentBox.x}px`,
                    top: `${currentBox.y}px`,
                    width: `${currentBox.width}px`,
                    height: `${currentBox.height}px`,
                    opacity: 0.5
                  }}
                />
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
                  <small>※PDF解析に失敗した場合はデモデータが表示されます</small>
                </p>
              ) : (
                measurements.map((m, index) => (
                  <div 
                    key={index} 
                    style={styles.measurementItem(
                      !!boxes[index]?.value,
                      m.isOutOfTolerance
                    )}
                  >
                    <span>{index + 1}. {m.name}</span>
                    <strong style={{ color: m.isOutOfTolerance ? '#dc3545' : 'inherit' }}>
                      {m.value} {m.unit}
                    </strong>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ marginTop: '20px', padding: '10px', background: '#e9ecef', borderRadius: '10px' }}>
              <p>📊 ステータス</p>
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                <span>ボックス数: <strong>{boxes.length}</strong></span>
                <span>測定値数: <strong>{measurements.length}</strong></span>
                <span>転記済み: <strong>{boxes.filter(b => b.value).length}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MeasurementPage