"use client";

import { useRouter } from "next/navigation";
import { QuizGame } from "@/games/quiz/QuizGame";

export default function QuizPage() {
  const router = useRouter();

  return <QuizGame onBack={() => router.push("/")} />;
}
