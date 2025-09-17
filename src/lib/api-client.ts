// src/lib/api-client.ts

import { fetchAuthSession } from '@aws-amplify/auth'
import { getCurrentUser } from '@aws-amplify/auth'

// 型定義
interface SaveWorkStateData {
  fileName: string
  boxes: any[]
  measurements: any[]
  viewTransform: any
  settings: any
  drawingImage?: string
  version: string
}

interface SaveWorkStateResult {
  workId?: string
  success?: boolean
  savedAt?: string
  [key: string]: any
}

class MeasurementAPI {
  private apiEndpoint: string
  private useLocalApi: boolean

  constructor() {
    // 環境に応じてエンドポイントを切り替え
    this.apiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || ''
    // ローカル開発環境かプロダクションかを判定
    this.useLocalApi = !this.apiEndpoint || process.env.NODE_ENV === 'development'

    if (this.useLocalApi) {
      console.log('Using local Next.js API routes')
    } else {
      console.log('Using AWS API Gateway:', this.apiEndpoint)
    }
  }

  private async getAuthToken(): Promise<string> {
    try {
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()
      if (!token) {
        throw new Error('No token available')
      }
      return token
    } catch (error) {
      console.error('Failed to get auth token:', error)
      throw new Error('認証エラー')
    }
  }

  private async getCurrentUserId(): Promise<string> {
    try {
      const user = await getCurrentUser()
      return user.username || user.userId
    } catch (error) {
      console.error('Failed to get current user:', error)
      throw new Error('ユーザー情報の取得に失敗しました')
    }
  }

  async saveWorkState(saveData: SaveWorkStateData): Promise<SaveWorkStateResult> {
    try {
      // ローカルAPIを使用する場合
      if (this.useLocalApi) {
        const userId = await this.getCurrentUserId()

        // 画像データが大きすぎる場合は警告
        const dataToSave = { ...saveData }
        if (dataToSave.drawingImage && dataToSave.drawingImage.length > 1000000) {
          console.warn('画像データが大きすぎるため、圧縮または除外します')
          dataToSave.drawingImage = '' // 一時的に画像を除外
        }

        const response = await fetch('/api/workstates/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            ...dataToSave,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `保存に失敗しました: ${response.status}`)
        }

        const result = await response.json()
        console.log('Save successful:', result)
        return result
      }
      // AWS API Gatewayを使用する場合
      else {
        const token = await this.getAuthToken()

        const response = await fetch(`${this.apiEndpoint}/workstates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
          body: JSON.stringify(saveData),
        })

        if (!response.ok) {
          throw new Error(`保存に失敗しました: ${response.status}`)
        }

        const result = await response.json()
        return result
      }
    } catch (error) {
      console.error('Save work state error:', error)
      throw error
    }
  }

  async loadWorkStates() {
    try {
      // ローカルAPIを使用する場合
      if (this.useLocalApi) {
        const userId = await this.getCurrentUserId()

        const response = await fetch(`/api/workstates/load?userId=${encodeURIComponent(userId)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `読み込みに失敗しました: ${response.status}`)
        }

        const result = await response.json()
        console.log('Loaded work states:', result)
        return Array.isArray(result) ? result : []
      }
      // AWS API Gatewayを使用する場合
      else {
        const token = await this.getAuthToken()

        const response = await fetch(`${this.apiEndpoint}/workstates`, {
          method: 'GET',
          headers: {
            Authorization: token,
          },
        })

        if (!response.ok) {
          throw new Error(`読み込みに失敗しました: ${response.status}`)
        }

        const result = await response.json()
        return result.data || []
      }
    } catch (error) {
      console.error('Load work states error:', error)
      throw error
    }
  }

  async loadWorkState(workId: string) {
    try {
      // ローカルAPIを使用する場合
      if (this.useLocalApi) {
        const userId = await this.getCurrentUserId()

        const response = await fetch(
          `/api/workstates/load?userId=${encodeURIComponent(userId)}&workId=${encodeURIComponent(workId)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `読み込みに失敗しました: ${response.status}`)
        }

        const result = await response.json()
        console.log('Loaded work state:', result)
        return result
      }
      // AWS API Gatewayを使用する場合
      else {
        const token = await this.getAuthToken()

        const response = await fetch(`${this.apiEndpoint}/workstates/${workId}`, {
          method: 'GET',
          headers: {
            Authorization: token,
          },
        })

        if (!response.ok) {
          throw new Error(`読み込みに失敗しました: ${response.status}`)
        }

        const result = await response.json()
        return result.data
      }
    } catch (error) {
      console.error('Load work state error:', error)
      throw error
    }
  }
}

export const measurementAPI = new MeasurementAPI()
