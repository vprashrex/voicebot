"use client";

import { VoiceBot } from "@/components/voice-bot";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <VoiceBot />
    </main>
  );
}