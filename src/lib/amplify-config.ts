'use client'

import { Amplify } from 'aws-amplify'

// Amplify v6の新しい設定形式
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
      identityPoolId: undefined, // 不要な場合はundefined
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code' as const,
      userAttributes: {
        email: {
          required: true,
        },
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
      // MFA設定（オプション）
      mfa: {
        status: 'off' as const,
        totpEnabled: false,
        smsEnabled: false,
      },
    },
  },
}

// 初期化
if (typeof window !== 'undefined') {
  Amplify.configure(amplifyConfig)
}

export default amplifyConfig
