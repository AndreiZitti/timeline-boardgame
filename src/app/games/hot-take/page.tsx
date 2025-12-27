"use client";

import { useRouter } from "next/navigation";
import { HotTakeGame } from "@/games/hot-take/HotTakeGame";
import { useUser } from "@/contexts/UserContext";

export default function HotTakePage() {
  const router = useRouter();
  const { profile, updateName } = useUser();

  return (
    <HotTakeGame
      onBack={() => router.push("/")}
      savedName={profile.name}
      onUpdateName={updateName}
    />
  );
}
