"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { authService } from "@/services/auth";

// Zod login schema validation
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);
    setIsLoading(true);

    try {
      // Validate with Zod
      loginSchema.parse(data);

      await authService.login(data.email, data.password);
      router.push("/dashboard");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setFormError(err.errors[0]?.message || "Validation failed");
      } else {
        setFormError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100 text-center">
          Welcome back
        </h2>
        <p className="text-xs text-zinc-400 text-center mt-1">
          Enter your credentials to access your workspace
        </p>
      </div>

      {formError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs font-medium animate-fade-in-up">
          {formError}
        </div>
      )}

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

        <div className="space-y-1">
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            disabled={isLoading}
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
          />
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          isLoading={isLoading}
        >
          Sign In
        </Button>
      </form>

      <div className="text-center text-xs text-zinc-450 border-t border-zinc-800/60 pt-4">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
        >
          Create one
        </Link>
      </div>
    </div>
  );
}
