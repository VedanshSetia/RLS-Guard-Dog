'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/app/components/providers/auth-provider'

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userType: 'teacher' | 'student'
  onSuccess: () => void
}

export function CreateUserDialog({ 
  open, 
  onOpenChange, 
  userType,
  onSuccess 
}: CreateUserDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    classroomId: '',
  })
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { session } = useAuth()

  // Fetch classrooms for dropdown if student
  useEffect(() => {
    if (userType === 'student' && open) {
      const fetchClassrooms = async () => {
        try {
          const headers: HeadersInit = {};
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
          const res = await fetch('/api/classrooms', { headers });
          const data = await res.json();
          setClassrooms(Array.isArray(data.classrooms) ? data.classrooms : []);
        } catch (err) {
          setClassrooms([]);
        }
      };
      fetchClassrooms();
    }
  }, [userType, open, session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (userType === 'student' && !formData.classroomId) {
        toast({
          variant: "destructive",
          title: "Classroom required",
          description: "Please select a classroom for the student.",
        });
        setLoading(false);
        return;
      }
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          ...formData,
          role: userType,
          mustChangePassword: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Error creating user",
          description: data.error || 'Failed to create user',
        });
        return;
      }

      toast({
        title: "User created successfully",
        description: `${formData.firstName} ${formData.lastName} has been added as a ${userType}.`,
      });

      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        classroomId: '',
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating user",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New {userType === 'teacher' ? 'Teacher' : 'Student'}</DialogTitle>
          <DialogDescription>
            Add a new {userType} to your school. They will receive login credentials via email.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john.doe@school.com"
              required
            />
          </div>


          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter temporary password"
              required
            />
            <p className="text-xs text-muted-foreground">
              The user will be required to change this password on first login.
            </p>
          </div>

          {/* Classroom selection for students */}
          {userType === 'student' && (
            <div className="space-y-2">
              <Label htmlFor="classroom">Classroom</Label>
              <Select
                value={formData.classroomId}
                onValueChange={(value) => setFormData({ ...formData, classroomId: value })}
                required
              >
                <SelectTrigger id="classroom">
                  <SelectValue placeholder="Select classroom" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.length === 0 ? (
                      <div className="text-muted-foreground px-2 py-1">No classrooms found</div>
                  ) : (
                    classrooms.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name || c.classroom_name || c.id}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${userType === 'teacher' ? 'Teacher' : 'Student'}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
