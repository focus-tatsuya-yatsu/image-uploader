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
  workId?: string // workIdをオプションプロパティとして追加
}

class MeasurementAPI {
  private apiEndpoint: string

  constructor() {
    this.apiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || ''
    console.log('API Endpoint:', this.apiEndpoint)
  }

  private async getAuthToken(): Promise<string> {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.idToken?.toString() || ''
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

  // saveWorkStateの引数はSaveWorkStateData型なので、修正は不要。
  // 呼び出し元でworkIdを渡せば、そのままbodyに含まれる。
  async saveWorkState(saveData: SaveWorkStateData) {
    try {
      const userId = await this.getCurrentUserId()
      const token = await this.getAuthToken()

      // /workstates に POSTする（/workstates/saveではない）
      const url = `${this.apiEndpoint}/workstates`
      console.log('Saving to:', url)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          userId,
          ...saveData, // workIdがあればここで展開される
        }),
      })

      const responseText = await response.text()
      console.log('Response status:', response.status)
      console.log('Response:', responseText)

      if (!response.ok) {
        throw new Error(`保存失敗: ${response.status} - ${responseText}`)
      }

      return JSON.parse(responseText)
    } catch (error) {
      console.error('Save error:', error)
      throw error
    }
  }

  async loadWorkStates() {
    try {
      const userId = await this.getCurrentUserId()
      const token = await this.getAuthToken()

      // /workstates に GETする
      const url = `${this.apiEndpoint}/workstates?userId=${encodeURIComponent(userId)}`
      console.log('Loading from:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: token,
        },
      })

      const responseText = await response.text()
      console.log('Load response:', responseText)

      if (!response.ok) {
        throw new Error(`読み込み失敗: ${response.status} - ${responseText}`)
      }

      const result = JSON.parse(responseText)
      return result.data || [] // resultの中からdata配列を取り出して返す
    } catch (error) {
      console.error('Load error:', error)
      throw error
    }
  }

  async loadWorkState(workId: string) {
    try {
      const token = await this.getAuthToken()

      // /workstates/{workId} に GETする
      const url = `${this.apiEndpoint}/workstates/${encodeURIComponent(workId)}`
      console.log('Loading work state:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: token,
        },
      })

      if (!response.ok) {
        throw new Error(`読み込み失敗: ${response.status}`)
      }

      const result = await response.json() // ← 一度、小包を変数に入れる
      return result.data // ← 小包の中から "data" を取り出して返す
    } catch (error) {
      console.error('Load work state error:', error)
      throw error
    }
  }
}

export const measurementAPI = new MeasurementAPI()
