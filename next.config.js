/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Three Fiber needs transpilation in Next 14
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
}

module.exports = nextConfig
