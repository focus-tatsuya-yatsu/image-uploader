// src/lib/api-client.ts

import { fetchAuthSession } from '@aws-amplify/auth'
import { getCurrentUser } from '@aws-amplify/auth'

interface SaveWorkStateData {
  fileName: string
  boxes: any[]
  measurements: any[]
  viewTransform: any
  settings: any
  drawingImage?: string
  version: string
}

class MeasurementAPI {
  private apiEndpoint: string

  constructor() {
    // 環境変数からAPIエンドポイントを取得
    // 本番: API GatewayのURL
    // 開発: ローカルのNext.js APIルート
    this.apiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3001'

    console.log('API Endpoint:', this.apiEndpoint)
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

  async saveWorkState(saveData: SaveWorkStateData) {
    try {
      const userId = await this.getCurrentUserId()
      const token = await this.getAuthToken()

      const response = await fetch(`${this.apiEndpoint}/workstates/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          ...saveData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `保存に失敗しました: ${response.status}`)
      }

      const result = await response.json()
      console.log('Save successful:', result)
      return result
    } catch (error) {
      console.error('Save work state error:', error)
      throw error
    }
  }

  async loadWorkStates() {
    try {
      const userId = await this.getCurrentUserId()
      const token = await this.getAuthToken()

      const response = await fetch(
        `${this.apiEndpoint}/workstates/load?userId=${encodeURIComponent(userId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `読み込みに失敗しました: ${response.status}`)
      }

      const result = await response.json()
      console.log('Loaded work states:', result)
      return Array.isArray(result) ? result : []
    } catch (error) {
      console.error('Load work states error:', error)
      throw error
    }
  }

  async loadWorkState(workId: string) {
    try {
      const userId = await this.getCurrentUserId()
      const token = await this.getAuthToken()

      const response = await fetch(
        `${this.apiEndpoint}/workstates/load?userId=${encodeURIComponent(userId)}&workId=${encodeURIComponent(workId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
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
    } catch (error) {
      console.error('Load work state error:', error)
      throw error
    }
  }
}

export const measurementAPI = new MeasurementAPI()
