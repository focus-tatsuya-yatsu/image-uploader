// app/api/workstates/save/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

// DynamoDBクライアントの初期化
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const dynamoDB = DynamoDBDocumentClient.from(client)

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json()
    
    console.log('Save request received for user:', body.userId)

    // 必須フィールドの検証
    if (!body.userId || !body.fileName) {
      return NextResponse.json(
        { error: 'userId and fileName are required' },
        { status: 400 }
      )
    }

    // 保存データの準備
    const workId = uuidv4()
    const timestamp = new Date().toISOString()

    const item = {
      workId,
      userId: body.userId,
      fileName: body.fileName,
      savedAt: timestamp,
      updatedAt: timestamp,
      boxes: body.boxes || [],
      measurements: body.measurements || [],
      viewTransform: body.viewTransform || { scale: 1, translateX: 0, translateY: 0 },
      settings: body.settings || {},
      drawingImage: body.drawingImage || '',
      version: body.version || '1.0.0',
      // メタデータ
      boxCount: body.boxes ? body.boxes.length : 0,
      measurementCount: body.measurements ? body.measurements.length : 0,
    }

    // DynamoDBに保存
    await dynamoDB.send(
      new PutCommand({
        TableName: 'MeasurementWorkStates',
        Item: item,
      })
    )

    console.log('Successfully saved work state:', workId)

    return NextResponse.json({
      success: true,
      workId,
      savedAt: timestamp,
    })
  } catch (error) {
    console.error('Error saving work state:', error)
    return NextResponse.json(
      { 
        error: 'Failed to save work state',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}