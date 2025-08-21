'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './ImageViewer.module.css'
import type { ImageFile } from '@/types'

interface ImageViewerProps {
  image: ImageFile | null
  onClose: () => void
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ image, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState(100)
  const [imageError, setImageError] = useState(false)
  const imageWrapperRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  // ズームレベルのプリセット
  const zoomPresets = [25, 50, 75, 100, 125, 150, 200, 300, 400]

  // 画面に合わせるズームレベルを計算
  const calculateFitZoom = () => {
    if (!imageWrapperRef.current || imageDimensions.width === 0) return 100

    const wrapperRect = imageWrapperRef.current.getBoundingClientRect()
    const widthRatio = (wrapperRect.width - 40) / imageDimensions.width
    const heightRatio = (wrapperRect.height - 40) / imageDimensions.height
    const fitZoom = Math.min(widthRatio, heightRatio) * 100

    return Math.min(Math.max(fitZoom, 25), 400)
  }

  // スクロール位置を中央にリセット
  const centerImage = () => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const scrollLeft = (container.scrollWidth - container.clientWidth) / 2
    const scrollTop = (container.scrollHeight - container.clientHeight) / 2
    
    container.scrollLeft = scrollLeft
    container.scrollTop = scrollTop
  }

  useEffect(() => {
    // 画像が変更されたらリセット
    if (image) {
      setImageError(false)
      setIsImageLoaded(false)
      setZoomLevel(100) // 一旦100%にリセット
    }
  }, [image])

  // 画像が読み込まれたら自動的に画面に合わせる
  useEffect(() => {
    if (isImageLoaded && imageDimensions.width > 0) {
      const fitZoom = calculateFitZoom()
      setZoomLevel(fitZoom)
      
      // 少し遅延を入れてから中央に配置
      setTimeout(() => {
        centerImage()
      }, 100)
    }
  }, [isImageLoaded, imageDimensions])

  // ズームレベルが変更されたら中央を維持
  useEffect(() => {
    if (isImageLoaded) {
      // ズーム変更後に中央を維持
      setTimeout(() => {
        centerImage()
      }, 50)
    }
  }, [zoomLevel])

  if (!image) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleZoomIn = () => {
    const currentIndex = zoomPresets.findIndex(preset => preset >= zoomLevel)
    if (currentIndex < zoomPresets.length - 1) {
      setZoomLevel(zoomPresets[currentIndex + 1])
    }
  }

  const handleZoomOut = () => {
    const currentIndex = zoomPresets.findIndex(preset => preset >= zoomLevel)
    if (currentIndex > 0) {
      setZoomLevel(zoomPresets[currentIndex - 1])
    } else if (zoomLevel > 25) {
      // 25%より小さい場合でも25%に設定
      setZoomLevel(25)
    }
  }

  const handleZoomReset = () => {
    setZoomLevel(100)
  }

  const handleZoomFit = () => {
    const fitZoom = calculateFitZoom()
    setZoomLevel(fitZoom)
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    setIsImageLoaded(true)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <AnimatePresence>
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
      >
        <motion.div
          className={styles.container}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* クローズボタン */}
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="画像を閉じる"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* 画像情報 */}
          <div className={styles.imageInfo}>
            <div className={styles.imageInfoLeft}>
              <h3>{image.name}</h3>
              <p>
                {formatFileSize(image.size)} • {image.type.split('/')[1].toUpperCase()}
                {imageDimensions.width > 0 && ` • ${imageDimensions.width}×${imageDimensions.height}px`}
              </p>
            </div>
            
            {/* ズームコントロール */}
            <div className={styles.zoomControls}>
              <button
                className={styles.zoomButton}
                onClick={handleZoomOut}
                disabled={zoomLevel <= 25}
                title="縮小 (Ctrl+-)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>

              <button
                className={styles.zoomButton}
                onClick={handleZoomReset}
                title="100%に戻す"
              >
                <span className={styles.zoomLevel}>{Math.round(zoomLevel)}%</span>
              </button>

              <button
                className={styles.zoomButton}
                onClick={handleZoomIn}
                disabled={zoomLevel >= 400}
                title="拡大 (Ctrl++)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>

              <div className={styles.separator}></div>

              <button
                className={styles.zoomButton}
                onClick={handleZoomFit}
                title="画面に合わせる"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8V6a2 2 0 0 1 2-2h2"></path>
                  <path d="M21 8V6a2 2 0 0 0-2-2h-2"></path>
                  <path d="M3 16v2a2 2 0 0 0 2 2h2"></path>
                  <path d="M21 16v2a2 2 0 0 1-2 2h-2"></path>
                </svg>
              </button>

              <button
                className={styles.zoomButton}
                onClick={centerImage}
                title="中央に移動"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6"></path>
                  <path d="M12 17v6"></path>
                  <path d="M1 12h6"></path>
                  <path d="M17 12h6"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* 画像表示エリア */}
          <div className={styles.imageWrapper} ref={imageWrapperRef}>
            {imageError ? (
              <div className={styles.errorMessage}>
                画像の読み込みに失敗しました
              </div>
            ) : (
              <div 
                className={styles.imageScrollContainer}
                ref={scrollContainerRef}
              >
                <div 
                  className={styles.imageContainer}
                  style={{
                    width: `${imageDimensions.width * (zoomLevel / 100)}px`,
                    height: `${imageDimensions.height * (zoomLevel / 100)}px`,
                    minWidth: '100%',
                    minHeight: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className={styles.image}
                    style={{ 
                      width: `${imageDimensions.width * (zoomLevel / 100)}px`,
                      height: `${imageDimensions.height * (zoomLevel / 100)}px`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                      objectFit: 'contain'
                    }}
                    onError={() => setImageError(true)}
                    onLoad={handleImageLoad}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ショートカットヘルプ */}
          <div className={styles.shortcutHelp}>
            <span>マウスホイール: スクロール</span>
            <span>自動フィット表示</span>
            <span>中央ボタンで位置リセット</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}