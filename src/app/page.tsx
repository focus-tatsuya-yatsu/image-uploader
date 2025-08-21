'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageUploader } from '@/components/ImageUploader/ImageUploader'
import { ImageViewer } from '@/components/ImageViewer/ImageViewer'
import type { ImageFile } from '@/types'
import styles from './page.module.css'

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null)
  const [recentImages, setRecentImages] = useState<ImageFile[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleImageSelect = (image: ImageFile) => {
    setSelectedImage(image)
    // 最近の画像リストに追加（最大5枚）
    setRecentImages(prev => [image, ...prev.slice(0, 4)])
  }

  const handleCloseViewer = () => {
    setSelectedImage(null)
  }

  const handleRecentImageClick = (image: ImageFile) => {
    setSelectedImage(image)
  }

  const handleDeleteClick = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation() // 親要素のクリックイベントを防ぐ
    setDeleteConfirm(imageId)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      setRecentImages(prev => prev.filter(img => img.id !== deleteConfirm))
      // もし削除した画像が現在表示中の画像なら、ビューアを閉じる
      if (selectedImage?.id === deleteConfirm) {
        setSelectedImage(null)
      }
      setDeleteConfirm(null)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm(null)
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
          <span className={styles.titleGradient}>Image Viewer</span>
        </h1>
        <p className={styles.subtitle}>
          画像をドラッグ&ドロップまたは選択してアップロード
        </p>
      </motion.header>

      {/* メインコンテンツ */}
      <main className={styles.main}>
        <ImageUploader onImageSelect={handleImageSelect} />

        {/* 最近アップロードした画像 */}
        {recentImages.length > 0 && (
          <motion.div
            className={styles.recentSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className={styles.recentTitle}>最近の画像</h2>
            <div className={styles.recentGrid}>
              <AnimatePresence>
                {recentImages.map((image, index) => (
                  <motion.div
                    key={image.id}
                    className={styles.recentImageWrapper}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleRecentImageClick(image)}
                  >
                    {/* 削除ボタン */}
                    <button
                      className={styles.deleteButton}
                      onClick={(e) => handleDeleteClick(e, image.id)}
                      aria-label="画像を削除"
                    >
                      <svg
                        width="16"
                        height="16"
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
                    
                    <img
                      src={image.url}
                      alt={image.name}
                      className={styles.recentImage}
                    />
                    <div className={styles.recentImageOverlay}>
                      <span className={styles.recentImageName}>
                        {image.name.length > 20
                          ? `${image.name.substring(0, 20)}...`
                          : image.name}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </main>

      {/* フッター */}
      <motion.footer
        className={styles.footer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <p>Next.js & React</p>
      </motion.footer>

      {/* 画像ビューア */}
      <AnimatePresence>
        {selectedImage && (
          <ImageViewer
            image={selectedImage}
            onClose={handleCloseViewer}
          />
        )}
      </AnimatePresence>

      {/* 削除確認ダイアログ */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className={styles.confirmDialog}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.confirmContent}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3>画像を削除しますか？</h3>
              <p>この操作は取り消せません。</p>
              <div className={styles.confirmButtons}>
                <button
                  className={styles.cancelButton}
                  onClick={cancelDelete}
                >
                  キャンセル
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={confirmDelete}
                >
                  削除する
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}