"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { authService } from "@/services/auth";
import { supabase } from "@/services/auth/supabaseClient";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>();

  useEffect(() => {
    // Supabase's recovery link establishes a session client-side from the
    // URL fragment before this effect runs; if that never happens, the link
    // was invalid/expired and there is no session to set a new password on.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setLinkInvalid(true);
      }
    });
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setSubmitError(null);
    try {
      resetPasswordSchema.parse(data);
      await authService.updatePassword(data.password);
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to reset password. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (linkInvalid) {
    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <div>
          <h2 className="text-xl font-bold text-red-400">Link expired or invalid</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            This password reset link is no longer valid. Request a new one to continue.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <div>
          <h2 className="text-xl font-bold text-green-400">Password updated</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Your password has been reset. You can now sign in with your new password.
          </p>
        </div>
        <Button onClick={() => router.push("/login")} className="w-full">
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100 text-center">Set a new password</h2>
        <p className="text-xs text-zinc-400 text-center mt-1">
          Choose a new password for your account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="password"
          label="New Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          disabled={isLoading || !sessionReady}
          {...register("password", { required: "Password is required" })}
        />
        <Input
          id="confirmPassword"
          label="Confirm New Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          disabled={isLoading || !sessionReady}
          {...register("confirmPassword", { required: "Please confirm your password" })}
        />

        {submitError && <p className="text-xs text-red-400 -mt-1">{submitError}</p>}

        <Button type="submit" className="w-full mt-2" isLoading={isLoading} disabled={!sessionReady}>
          Reset Password
        </Button>
      </form>
    </div>
  );
}
