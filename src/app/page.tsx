"use client";

import { useState } from "react";
import { GameHub } from "@/components/GameHub";
import { Profile } from "@/components/Profile";

export default function Home() {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <GameHub onOpenProfile={() => setShowProfile(true)} />
      <Profile isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}
