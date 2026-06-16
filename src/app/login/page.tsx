"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { QuoteCarousel } from "@/components/quote-carousel";
import toast from "react-hot-toast";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1.5">{message}</p>;
}

function SessionErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (error !== "SessionExpired") return null;

  return (
    <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
      Your session has expired or your account was deactivated. Please sign in again.
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginForm) {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("DEACTIVATED")) {
          toast.error(
            "This account has been deactivated. Contact your manager.",
            { duration: 5000 }
          );
        } else {
          toast.error("Invalid email or password.");
        }
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — image + quote (desktop only) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 flex-col p-12">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('../bg-img.webp')" }}
        />
        <div className="absolute inset-0 bg-gray-900/70" />
        <div className="flex-1 flex flex-col justify-end pb-4">
          <QuoteCarousel />
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex flex-col items-center justify-start bg-background px-4 py-4 sm:px-6">
        {/* Logo */}
        <div className="w-36 sm:w-44 h-14 sm:h-18 mb-6 sm:mb-30">
          <img
            src="/trackly-logo.png"
            alt="Trackly"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to your account to continue
            </p>
          </div>

          {/* Session expired banner */}
          <Suspense fallback={null}>
            <SessionErrorBanner />
          </Suspense>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <Input
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                disabled={isLoading}
                className={`h-10 sm:h-11 ${errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                {...register("email")}
              />
              <FieldError message={errors.email?.message} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className={`h-10 sm:h-11 pr-10 ${errors.password ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                  {...register("password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <FieldError message={errors.password?.message} />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-10 sm:h-11 font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}