"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { authService } from "@/services/auth";

// Zod registration schema
const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const onSubmit = async (data: RegisterFormData) => {
    setFormError(null);
    setIsLoading(true);

    try {
      // Validate schema
      registerSchema.parse(data);

      await authService.register(data.name, data.email, data.password);
      router.push("/dashboard");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setFormError(err.errors[0]?.message || "Validation failed");
      } else {
        setFormError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100 text-center">
          Create an account
        </h2>
        <p className="text-xs text-zinc-400 text-center mt-1">
          Join MotionAI and start generating captions
        </p>
      </div>

      {formError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs font-medium animate-fade-in-up">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="name"
          label="Full Name"
          type="text"
          placeholder="John Doe"
          error={errors.name?.message}
          disabled={isLoading}
          {...register("name", { required: "Name is required" })}
        />

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

        <Input
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          disabled={isLoading}
          {...register("confirmPassword", {
            required: "Please confirm your password",
          })}
        />

        <Button
          type="submit"
          className="w-full mt-2"
          isLoading={isLoading}
        >
          Sign Up
        </Button>
      </form>

      <div className="text-center text-xs text-zinc-450 border-t border-zinc-800/60 pt-4">
        Already have an account?{" "}
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
