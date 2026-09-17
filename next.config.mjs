/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXTAUTH_SECRET:
      process.env.NEXTAUTH_SECRET ||
      "secureledger_super_secret_jwt_key_2026_x89_secure",
    NEXTAUTH_URL:
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://secure-ledger-six.vercel.app"),
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "harshit@secureledger.com",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "123",
  },
};

export default nextConfig;
