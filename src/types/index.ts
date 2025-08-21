// 画像ファイルの情報を表す型
export interface ImageFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: Date
}

// アップロード状態を表す型
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

// サポートする画像形式
export const SUPPORTED_FORMATS: string[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/tiff',
  'image/vnd.adobe.photoshop', // PSD
  'image/webp',
  'image/svg+xml',
]

// 最大ファイルサイズ（50MB）
export const MAX_FILE_SIZE = 50 * 1024 * 1024