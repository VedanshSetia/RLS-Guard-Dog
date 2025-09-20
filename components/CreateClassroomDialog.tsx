'use client'

import React, { useState } from 'react'
import { useAuth } from '@/app/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface CreateClassroomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateClassroomDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: CreateClassroomDialogProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { session } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ name }),
      })

      const data = await response.json()

      if (!response.ok) {
        let debug = '';
        if (response.status === 403 && data?.debug) {
          debug = `\nRole: ${data.debug.profile?.role}\nUser: ${data.debug.user?.id}`;
        }
        toast({
          variant: "destructive",
          title: "Error creating classroom",
          description: (data.error || 'Failed to create classroom') + debug,
        })
        return
      }

      toast({
        title: "Classroom created successfully",
        description: `${name} has been added to your school.`,
      })

      setName('')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating classroom",
        description: error?.message || String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Classroom</DialogTitle>
          <DialogDescription>
            Add a new classroom to your school. You can assign teachers to it later.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Classroom Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Grade 5A, Mathematics Lab"
              required
            />
          </div>

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
                'Create Classroom'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
