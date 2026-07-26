import type { NextConfig } from "next";

const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 32);

const nextConfig: NextConfig = {
  // Ajuda o cliente a detectar deploy novo e recarregar (evita ChunkLoadError)
  ...(sha ? { deploymentId: sha } : {}),
};

export default nextConfig;
