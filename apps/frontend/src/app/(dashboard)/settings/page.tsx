"use client";

import React from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-150">Settings</h1>
        <p className="text-xs text-zinc-400 mt-1">Manage profile credentials and preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card className="space-y-4 border-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-200">Profile Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="username" label="Display Name" defaultValue="Creator Chris" />
            <Input id="useremail" label="Email Address" defaultValue="chris@example.com" disabled />
          </div>
          <Button size="sm" className="mt-2">Update Info</Button>
        </Card>

        <Card className="space-y-4 border-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-200">API Credentials</h3>
          <p className="text-xs text-zinc-400">Add credentials for custom transcription or AI models.</p>
          <div className="space-y-3">
            <Input id="fireworksKey" label="Fireworks API Key" type="password" placeholder="••••••••••••••••" />
            <Input id="geminiKey" label="Gemini API Key" type="password" placeholder="••••••••••••••••" />
          </div>
          <Button size="sm" variant="secondary" className="mt-2">Save Keys</Button>
        </Card>
      </div>
    </div>
  );
}
