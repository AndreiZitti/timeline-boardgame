"use client";

import { useRouter } from "next/navigation";

export default function SecretHitlerPage() {
  const router = useRouter();

  return (
    <div className="screen secret-hitler-placeholder">
      <button className="btn-back" onClick={() => router.push("/")}>
        &larr; Back to Games
      </button>

      <h1>SECRET HITLER</h1>
      <p className="subtitle">Coming Soon</p>

      <div className="coming-soon-content">
        <p>This game is currently in development.</p>
        <p>Check back later!</p>
      </div>
    </div>
  );
}
