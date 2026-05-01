/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@rainbow-me/rainbowkit"],
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, "pino-pretty": false };
    config.externals.push("@react-native-async-storage/async-storage");
    return config;
  },
};

export default nextConfig;
