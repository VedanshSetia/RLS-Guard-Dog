'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, user, profile, fetchProfile } = useAuth()

  // Debug output
  useEffect(() => {
    console.log('Login.tsx user:', user)
    console.log('Login.tsx profile:', profile)
  }, [user, profile])
  const router = useRouter()
  const { toast } = useToast()

  // Helper to redirect based on role
  const redirectToDashboard = (profile: any) => {
    if (!profile) return
    if (profile.must_change_password) {
      router.push('/reset-password')
    } else {
      switch (profile.role) {
        case 'head_teacher':
          router.push('/head-teacher')
          break
        case 'teacher':
          router.push('/teacher')
          break
        case 'student':
          router.push('/student')
          break
      }
    }
  }



  useEffect(() => {
    if (user && profile) {
      redirectToDashboard(profile)
    }
  }, [user, profile, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)
    console.log('Login.tsx signIn error:', error)

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast({
          variant: "destructive",
          title: "Invalid credentials",
          description: "Please check your email and password and try again.",
        })
      }
    }

    setLoading(false)
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">RLS Guard Dog</CardTitle>
          <CardDescription>
            Sign in to your educational management portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account? Contact your head teacher.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
