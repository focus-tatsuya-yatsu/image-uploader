'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './page.module.css'

// 画像ファイルの型定義
interface ImageFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: Date
}

// アップロード状態の型定義
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/tiff',
  'image/vnd.adobe.photoshop',
  'image/webp',
  'image/svg+xml',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function Home() {
  const [uploadedImages, setUploadedImages] = useState<ImageFile[]>([])
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `ファイルサイズが大きすぎます。最大50MBまでです。`
    }

    if (!SUPPORTED_FORMATS.includes(file.type)) {
      if (file.name.toLowerCase().endsWith('.psd')) {
        return null
      }
      return `サポートされていないファイル形式です。`
    }

    return null
  }

  const processFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setUploadStatus('error')
      setTimeout(() => {
        setError(null)
        setUploadStatus('idle')
      }, 3000)
      return
    }

    setUploadStatus('uploading')
    setError(null)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageFile: ImageFile = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          type: file.type || 'image/vnd.adobe.photoshop',
          url: e.target?.result as string,
          uploadedAt: new Date(),
        }

        setTimeout(() => {
          setUploadStatus('success')
          setUploadedImages(prev => [...prev, imageFile])
          
          setTimeout(() => {
            setUploadStatus('idle')
          }, 1500)
        }, 500)
      }

      reader.onerror = () => {
        setError('ファイルの読み込みに失敗しました。')
        setUploadStatus('error')
        setTimeout(() => {
          setError(null)
          setUploadStatus('idle')
        }, 3000)
      }

      reader.readAsDataURL(file)
    } catch (err) {
      setError('予期しないエラーが発生しました。')
      setUploadStatus('error')
      setTimeout(() => {
        setError(null)
        setUploadStatus('idle')
      }, 3000)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev - 1)
    if (dragCounter === 1) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(0)
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && uploadedImages.length < 2) {
      processFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && uploadedImages.length < 2) {
      processFile(files[0])
    }
  }

  const handleDeleteImage = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId))
  }

  const handleReset = () => {
    setUploadedImages([])
    setUploadStatus('idle')
    setError(null)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={styles.container}>
      {/* 背景アニメーション */}
      <div className={styles.backgroundAnimation}>
        <div className={styles.gradientOrb1}></div>
        <div className={styles.gradientOrb2}></div>
        <div className={styles.gradientOrb3}></div>
      </div>

      {/* ヘッダー */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className={styles.title}>
          <span className={styles.titleGradient}>図面・測定結果ビューアー</span>
        </h1>
        <p className={styles.subtitle}>
          図面と測定結果を並べて表示できます（最大2ファイルまで）
        </p>
      </motion.header>

      {/* メインコンテンツ */}
      <main className={styles.main}>
        {/* リセットボタン - 画像がある時のみ表示 */}
        {uploadedImages.length > 0 && (
          <button 
            className={styles.resetButton}
            onClick={handleReset}
            title="すべての画像を削除"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14M10 11v6M14 11v6"/>
            </svg>
            すべてクリア
          </button>
        )}

        {/* コンテンツエリア */}
        <div className={
          uploadedImages.length === 0 
            ? styles.initialLayout 
            : uploadedImages.length === 1 
              ? styles.singleImageLayout 
              : styles.doubleImageLayout
        }>
          {/* 画像がない時：中央にアップロードUI */}
          {uploadedImages.length === 0 && (
            <motion.div
              className={`${styles.uploadContainer} ${isDragging ? styles.dragging : ''}`}
              onDragEnter={handleDragEnter}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className={styles.dropZone}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*,.psd"
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                  id="fileInput"
                />

                <div className={styles.content}>
                  <AnimatePresence mode="wait">
                    {uploadStatus === 'idle' && !isDragging && (
                      <motion.label
                        htmlFor="fileInput"
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.uploadArea}
                      >
                        <div className={styles.iconWrapper}>
                          <svg
                            className={styles.uploadIcon}
                            width="80"
                            height="80"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </div>
                        <h2 className={styles.uploadTitle}>図面をアップロード</h2>
                        <p className={styles.uploadSubtitle}>
                          ドラッグ&ドロップまたはクリックして選択
                        </p>
                        <p className={styles.formats}>
                          対応形式: JPEG, PNG, GIF, TIFF, PSD, WebP, SVG
                        </p>
                        <button className={styles.selectButton}>
                          ファイルを選択
                        </button>
                      </motion.label>
                    )}

                    {isDragging && (
                      <motion.div
                        key="dragging"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={styles.dragActiveArea}
                      >
                        <div className={styles.dragIcon}>
                          <svg
                            width="100"
                            height="100"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </div>
                        <p className={styles.dragText}>ここにドロップ</p>
                      </motion.div>
                    )}

                    {uploadStatus === 'uploading' && (
                      <motion.div
                        key="uploading"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={styles.statusArea}
                      >
                        <div className={styles.loader}>
                          <div className={styles.loaderBar}></div>
                        </div>
                        <p className={styles.statusText}>アップロード中...</p>
                      </motion.div>
                    )}

                    {uploadStatus === 'success' && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={styles.statusArea}
                      >
                        <motion.div
                          className={styles.successIcon}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', damping: 10 }}
                        >
                          ✓
                        </motion.div>
                        <p className={styles.statusText}>アップロード完了！</p>
                      </motion.div>
                    )}

                    {uploadStatus === 'error' && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={styles.statusArea}
                      >
                        <div className={styles.errorIcon}>✕</div>
                        <p className={styles.errorText}>{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* 画像が1つの時：左に画像、右にアップロードUI */}
          {uploadedImages.length === 1 && (
            <>
              {/* 左側：画像 */}
              <motion.div
                className={styles.imageCard}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.imageHeader}>
                  <h3>図面</h3>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteImage(uploadedImages[0].id)}
                    title="画像を削除"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div className={styles.imageInfo}>
                  <p className={styles.fileName}>{uploadedImages[0].name}</p>
                  <p className={styles.fileSize}>
                    {formatFileSize(uploadedImages[0].size)} • {uploadedImages[0].type.split('/')[1].toUpperCase()}
                  </p>
                </div>
                <div className={styles.imageWrapper}>
                  <img
                    src={uploadedImages[0].url}
                    alt={uploadedImages[0].name}
                    className={styles.displayedImage}
                  />
                </div>
              </motion.div>

              {/* 右側：アップロードUI */}
              <motion.div
                className={`${styles.uploadContainer} ${styles.secondUpload} ${isDragging ? styles.dragging : ''}`}
                onDragEnter={handleDragEnter}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div
                  className={styles.dropZone}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*,.psd"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                    id="fileInput2"
                  />

                  <div className={styles.content}>
                    <AnimatePresence mode="wait">
                      {uploadStatus === 'idle' && !isDragging && (
                        <motion.label
                          htmlFor="fileInput2"
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={styles.uploadArea}
                        >
                          <div className={styles.iconWrapper}>
                            <svg
                              className={styles.uploadIcon}
                              width="80"
                              height="80"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                          </div>
                          <h2 className={styles.uploadTitle}>測定結果をアップロード</h2>
                          <p className={styles.uploadSubtitle}>
                            ドラッグ&ドロップまたはクリックして選択
                          </p>
                          <p className={styles.formats}>
                            対応形式: JPEG, PNG, GIF, TIFF, PSD, WebP, SVG
                          </p>
                          <button className={styles.selectButton}>
                            ファイルを選択
                          </button>
                        </motion.label>
                      )}

                      {isDragging && (
                        <motion.div
                          key="dragging"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={styles.dragActiveArea}
                        >
                          <div className={styles.dragIcon}>
                            <svg
                              width="100"
                              height="100"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </div>
                          <p className={styles.dragText}>ここにドロップ</p>
                        </motion.div>
                      )}

                      {uploadStatus === 'uploading' && (
                        <motion.div
                          key="uploading"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={styles.statusArea}
                        >
                          <div className={styles.loader}>
                            <div className={styles.loaderBar}></div>
                          </div>
                          <p className={styles.statusText}>アップロード中...</p>
                        </motion.div>
                      )}

                      {uploadStatus === 'success' && (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={styles.statusArea}
                        >
                          <motion.div
                            className={styles.successIcon}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 10 }}
                          >
                            ✓
                          </motion.div>
                          <p className={styles.statusText}>アップロード完了！</p>
                        </motion.div>
                      )}

                      {uploadStatus === 'error' && (
                        <motion.div
                          key="error"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={styles.statusArea}
                        >
                          <div className={styles.errorIcon}>✕</div>
                          <p className={styles.errorText}>{error}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {/* 画像が2つの時：両画像を並べて表示 */}
          {uploadedImages.length === 2 && (
            <>
              {uploadedImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  className={styles.imageCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className={styles.imageHeader}>
                    <h3>{index === 0 ? '図面' : '測定結果'}</h3>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteImage(image.id)}
                      title="画像を削除"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  <div className={styles.imageInfo}>
                    <p className={styles.fileName}>{image.name}</p>
                    <p className={styles.fileSize}>
                      {formatFileSize(image.size)} • {image.type.split('/')[1].toUpperCase()}
                    </p>
                  </div>
                  <div className={styles.imageWrapper}>
                    <img
                      src={image.url}
                      alt={image.name}
                      className={styles.displayedImage}
                    />
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  )
}