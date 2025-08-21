'use client'

import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './ImageUploader.module.css'
import type { ImageFile, UploadStatus } from '@/types'
import { SUPPORTED_FORMATS, MAX_FILE_SIZE } from '@/types'

interface ImageUploaderProps {
  onImageSelect: (image: ImageFile) => void
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // コンポーネントのアンマウント時にカウンターをリセット
  useEffect(() => {
    return () => {
      dragCounterRef.current = 0
    }
  }, [])

  const validateFile = (file: File): string | null => {
    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return `ファイルサイズが大きすぎます。最大50MBまでです。`
    }

    // ファイルタイプチェック
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      // PSDファイルの特別処理
      if (file.name.toLowerCase().endsWith('.psd')) {
        return null // PSDファイルは許可
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
      // ファイルをBase64に変換
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
          onImageSelect(imageFile)
          
          // 成功メッセージを表示後、状態をリセット
          setTimeout(() => {
            setUploadStatus('idle')
          }, 1500)
        }, 500) // アップロードアニメーションのため少し遅延
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

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current++
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const hasFiles = Array.from(e.dataTransfer.items).some(
        item => item.kind === 'file'
      )
      if (hasFiles) {
        setIsDragging(true)
      }
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current--
    
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // ドラッグオーバー中は常にドロップを許可
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current = 0
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const handleClick = () => {
    if (uploadStatus === 'idle' || uploadStatus === 'error') {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={styles.uploaderContainer}>
      <motion.div
        className={`${styles.container} ${isDragging ? styles.dragging : ''}`}
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
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.psd"
            onChange={handleFileSelect}
            className={styles.fileInput}
          />

          <div className={styles.content}>
            <AnimatePresence mode="wait">
              {uploadStatus === 'idle' && !isDragging && (
                <motion.div
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
                  <h2 className={styles.title}>画像をアップロード</h2>
                  <p className={styles.subtitle}>
                    ドラッグ&ドロップまたはクリックして選択
                  </p>
                  <p className={styles.formats}>
                    対応形式: JPEG, PNG, GIF, TIFF, PSD, WebP, SVG
                  </p>
                  <button className={styles.selectButton}>
                    ファイルを選択
                  </button>
                </motion.div>
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
    </div>
  )
}