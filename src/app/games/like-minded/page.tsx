"use client";

import { useRouter } from "next/navigation";
import { LikeMindedGame } from "@/games/like-minded/LikeMindedGame";

export default function LikeMindedPage() {
  const router = useRouter();

  return <LikeMindedGame onBack={() => router.push("/")} />;
}
