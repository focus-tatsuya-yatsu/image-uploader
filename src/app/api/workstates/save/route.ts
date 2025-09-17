// app/api/workstates/save/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

// AWS クライアントの初期化
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const dynamoDB = DynamoDBDocumentClient.from(dynamoClient)

// Base64画像をS3にアップロードする関数
async function uploadImageToS3(base64Image: string, workId: string): Promise<string | null> {
  if (!base64Image) return null

  try {
    // Base64のプレフィックスを除去
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // ファイル名を生成（workIdを使用して一意性を保証）
    const fileName = `drawings/${workId}.png`

    // S3にアップロード
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: 'image/png',
      // 必要に応じて公開設定を追加
      // ACL: 'public-read',
    }

    await s3Client.send(new PutObjectCommand(uploadParams))

    // S3のURLを生成して返す
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-northeast-1'}.amazonaws.com/${fileName}`

    return s3Url
  } catch (error) {
    console.error('S3 upload error:', error)
    throw new Error('画像のアップロードに失敗しました')
  }
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json()

    console.log('Save request received for user:', body.userId)

    // 必須フィールドの検証
    if (!body.userId || !body.fileName) {
      return NextResponse.json({ error: 'userId and fileName are required' }, { status: 400 })
    }

    // 保存データの準備
    const workId = uuidv4()
    const timestamp = new Date().toISOString()

    // 画像データをS3にアップロード
    let s3ImageUrl: string | null = null // 型を明示的に指定
    if (body.drawingImage) {
      console.log('Uploading image to S3...')
      s3ImageUrl = await uploadImageToS3(body.drawingImage, workId)
      console.log('Image uploaded successfully:', s3ImageUrl) // ← s3ImageUrlを使用
    }

    // DynamoDBに保存するアイテム（画像URLのみを含む）
    const item = {
      workId,
      userId: body.userId,
      fileName: body.fileName,
      savedAt: timestamp,
      updatedAt: timestamp,
      imageUrl: s3ImageUrl, // S3のURLを保存
      boxes: body.boxes || [],
      measurements: body.measurements || [],
      viewTransform: body.viewTransform || { scale: 1, translateX: 0, translateY: 0 },
      settings: body.settings || {},
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
      imageUrl: s3ImageUrl, // クライアントにもURLを返す
    })
  } catch (error) {
    console.error('Error saving work state:', error)
    return NextResponse.json(
      {
        error: 'Failed to save work state',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
