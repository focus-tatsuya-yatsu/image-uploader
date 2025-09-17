// app/api/workstates/load/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const workId = searchParams.get('workId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
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
        return NextResponse.json(
          { error: 'Work state not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(result.Item)
    }

    // ユーザーの全ての保存データを取得
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

    return NextResponse.json(result.Items || [])
  } catch (error) {
    console.error('Error loading work states:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load work states',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}