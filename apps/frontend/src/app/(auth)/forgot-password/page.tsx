"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { authService } from "@/services/auth";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setSubmitError(null);
    try {
      forgotPasswordSchema.parse(data);
      await authService.requestPasswordReset(data.email);
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to send reset email. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <div>
          <h2 className="text-xl font-bold text-green-400">
            Check your email
          </h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            We have sent password recovery instructions to your email address.
          </p>
        </div>
        <div className="pt-2 border-t border-zinc-800/60">
          <Link
            href="/login"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100 text-center">
          Reset password
        </h2>
        <p className="text-xs text-zinc-400 text-center mt-1">
          Enter your email to receive recovery instructions
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="email"
          label="Email Address"
          type="email"
          placeholder="name@example.com"
          error={errors.email?.message}
          disabled={isLoading}
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address",
            },
          })}
        />

        {submitError && (
          <p className="text-xs text-red-400 -mt-1">{submitError}</p>
        )}

        <Button
          type="submit"
          className="w-full mt-2"
          isLoading={isLoading}
        >
          Send Link
        </Button>
      </form>

      <div className="text-center text-xs text-zinc-450 border-t border-zinc-800/60 pt-4">
        Remember your password?{" "}
        <Link
          href="/login"
          className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
