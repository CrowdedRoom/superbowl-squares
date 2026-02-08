/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: isProd ? '/superbowl-squares' : '',
  assetPrefix: isProd ? '/superbowl-squares/' : '',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
