// app/api/workstates/load/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'

// DynamoDBクライアントの初期化
const client = new DynamoDBClient({
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

const dynamoDB = DynamoDBDocumentClient.from(client)

// S3から画像を取得する関数
async function getImageFromS3(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null

  try {
    // S3のURLからキーを抽出
    const urlParts = imageUrl.split('.amazonaws.com/')
    if (urlParts.length < 2) return imageUrl // 既にBase64の場合はそのまま返す

    const key = urlParts[1]

    // S3から画像を取得
    const getParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
    }

    const command = new GetObjectCommand(getParams)
    const response = await s3Client.send(command)

    // ストリームをBase64に変換
    const chunks: Uint8Array[] = []
    const stream = response.Body as any

    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const base64 = buffer.toString('base64')

    // Data URLとして返す
    return `data:image/png;base64,${base64}`
  } catch (error) {
    console.error('S3 get error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const workId = searchParams.get('workId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // 特定のworkIdが指定されている場合（単一データ取得）
    if (workId) {
      console.log('Loading specific work state:', workId)

      const result = await dynamoDB.send(
        new GetCommand({
          TableName: 'MeasurementWorkStates',
          Key: {
            workId: workId,
          },
        })
      )

      if (!result.Item) {
        return NextResponse.json({ error: 'Work state not found' }, { status: 404 })
      }

      // 画像URLがある場合、実際の画像データを取得
      if (result.Item.imageUrl) {
        const imageData = await getImageFromS3(result.Item.imageUrl)
        result.Item.drawingImage = imageData // 互換性のためdrawingImageフィールドに設定
      }

      return NextResponse.json(result.Item)
    }

    // ユーザーの全ての保存データを取得（リスト表示用）
    console.log('Loading all work states for user:', userId)

    const result = await dynamoDB.send(
      new QueryCommand({
        TableName: 'MeasurementWorkStates',
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false, // 新しい順に並べる
        Limit: 50, // 最大50件まで取得
      })
    )

    console.log(`Found ${result.Items?.length || 0} work states`)

    // リスト表示では画像は取得しない（パフォーマンスのため）
    // 必要に応じて各アイテムにサムネイルURLを追加できます

    return NextResponse.json(result.Items || [])
  } catch (error) {
    console.error('Error loading work states:', error)
    return NextResponse.json(
      {
        error: 'Failed to load work states',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
