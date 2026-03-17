"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, Eye, EyeOff, Zap, ArrowRight, Github } from "lucide-react"

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[a-z]/, { message: "Must contain at least one lowercase letter" })
    .regex(/[A-Z]/, { message: "Must contain at least one uppercase letter" })
    .regex(/[0-9]/, { message: "Must contain at least one number" })
    .regex(/[^a-zA-Z0-9]/, { message: "Must contain at least one special character" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    setServerError(null)
    
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      console.log("Registration data:", data)
      alert("Registration successful! (Simulated)")
    } catch (error) {
      setServerError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fcfaf8] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background radial gradient */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-orange-50/50 blur-3xl"></div>
      </div>

      <div className="w-full max-w-[420px] space-y-8 relative z-10 rounded-3xl border border-[#ff7a59]/20 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0e6] mb-6">
            <Zap className="h-7 w-7 text-[#ff7a59] fill-[#ff7a59]" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">AI Lab Studio</h2>
          <p className="mt-3 text-sm text-slate-500 font-medium">
            Start your journey into the world of AI
          </p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <p>{serverError}</p>
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="name" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Full Name
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  {...register("name")}
                  className={`h-12 rounded-xl border-slate-200 bg-white px-4 text-sm placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0 shadow-sm ${errors.name ? "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500" : "focus-visible:ring-[#ff7a59] focus-visible:border-[#ff7a59]"}`}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Email address
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className={`h-12 rounded-xl border-slate-200 bg-white px-4 text-sm placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0 shadow-sm ${errors.email ? "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500" : "focus-visible:ring-[#ff7a59] focus-visible:border-[#ff7a59]"}`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={`h-12 rounded-xl border-slate-200 bg-white px-4 pr-12 text-sm placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0 shadow-sm ${errors.password ? "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500" : "focus-visible:ring-[#ff7a59] focus-visible:border-[#ff7a59]"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                  <span className="sr-only">Toggle password visibility</span>
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  className={`h-12 rounded-xl border-slate-200 bg-white px-4 pr-12 text-sm placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0 shadow-sm ${errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500" : "focus-visible:ring-[#ff7a59] focus-visible:border-[#ff7a59]"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 focus:outline-none transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                  <span className="sr-only">Toggle confirm password visibility</span>
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="h-12 w-full rounded-xl bg-[#ff7a59] text-base font-semibold text-white shadow-[0_4px_14px_0_rgba(255,122,89,0.39)] hover:bg-[#e66a4d] hover:shadow-[0_6px_20px_rgba(255,122,89,0.23)] transition-all" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Sign Up <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-10">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#fcfaf8] px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-12 rounded-xl border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </Button>
            <Button 
              variant="outline" 
              className="h-12 rounded-xl border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center"
            >
              <Github className="h-6 w-6 text-[#333]" />
            </Button>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-slate-500 font-medium">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#ff7a59] hover:text-[#e66a4d] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
