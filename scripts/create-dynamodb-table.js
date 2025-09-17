// scripts/create-dynamodb-table.js
// DynamoDBテーブルを作成するスクリプト

const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config({ path: '.env.local' });

// AWS設定
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function waitForTable(tableName) {
  console.log(`Waiting for table ${tableName} to be active...`);
  
  while (true) {
    try {
      const command = new DescribeTableCommand({ TableName: tableName });
      const response = await client.send(command);
      
      if (response.Table.TableStatus === 'ACTIVE') {
        console.log(`Table ${tableName} is now active!`);
        break;
      }
      
      console.log(`Table status: ${response.Table.TableStatus}. Waiting...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機
    } catch (error) {
      console.error('Error checking table status:', error);
      break;
    }
  }
}

async function createTable() {
  const tableName = 'MeasurementWorkStates';
  
  const params = {
    TableName: tableName,
    KeySchema: [
      { AttributeName: 'workId', KeyType: 'HASH' }, // パーティションキー
    ],
    AttributeDefinitions: [
      { AttributeName: 'workId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'savedAt', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIdIndex',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'savedAt', KeyType: 'RANGE' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: 'PROVISIONED', // または 'PAY_PER_REQUEST'
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    Tags: [
      {
        Key: 'Project',
        Value: 'MeasurementApp',
      },
      {
        Key: 'Environment',
        Value: 'Development',
      },
    ],
  };

  try {
    console.log('Creating DynamoDB table:', tableName);
    console.log('Using AWS Region:', process.env.AWS_REGION || 'ap-northeast-1');
    
    const command = new CreateTableCommand(params);
    const result = await client.send(command);
    
    console.log('Table creation initiated successfully!');
    console.log('Table ARN:', result.TableDescription.TableArn);
    
    // テーブルがアクティブになるまで待機
    await waitForTable(tableName);
    
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log(`✓ Table ${tableName} already exists`);
    } else if (error.name === 'ValidationException') {
      console.error('Validation error:', error.message);
      console.log('\nPlease check:');
      console.log('1. AWS credentials are properly set in .env.local');
      console.log('2. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are valid');
      console.log('3. The IAM user has DynamoDB permissions');
    } else {
      console.error('Error creating table:', error);
      console.error('Error details:', error.message);
    }
  }
}

// 環境変数の確認
function checkEnvironmentVariables() {
  console.log('Checking environment variables...\n');
  
  const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missing = [];
  
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      console.log(`✓ ${varName} is set`);
    }
  }
  
  if (missing.length > 0) {
    console.error('\n❌ Missing environment variables:', missing.join(', '));
    console.log('\nPlease add them to your .env.local file:');
    console.log('AWS_ACCESS_KEY_ID=your-access-key');
    console.log('AWS_SECRET_ACCESS_KEY=your-secret-key');
    console.log('AWS_REGION=ap-northeast-1');
    process.exit(1);
  }
  
  console.log('✓ All required environment variables are set\n');
}

// メイン実行
async function main() {
  console.log('========================================');
  console.log('DynamoDB Table Creation Script');
  console.log('========================================\n');
  
  // 環境変数チェック
  checkEnvironmentVariables();
  
  // テーブル作成
  await createTable();
  
  console.log('\n========================================');
  console.log('Script completed');
  console.log('========================================');
}

// スクリプト実行
main().catch(console.error);