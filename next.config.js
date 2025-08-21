/** @type {import('next').NextConfig} */
const nextConfig = {
  // SPAモードの設定
  output: 'export',
  
  // 画像の最適化を無効化（静的エクスポート時は必要）
  images: {
    unoptimized: true,
  },
  
  // トレーリングスラッシュの設定
  trailingSlash: true,
  
  // エイリアスの設定（tsconfig.jsonと合わせる）
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './src',
    }
    return config
  },
}

module.exports = nextConfig
