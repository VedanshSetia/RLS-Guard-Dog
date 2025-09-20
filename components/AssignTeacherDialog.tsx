'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/app/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
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

interface AssignTeacherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Classroom {
  id: string
  name: string
}

interface Teacher {
  id: string
  first_name: string
  last_name: string
}

export function AssignTeacherDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: AssignTeacherDialogProps) {
  const { session } = useAuth()
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchData = async () => {
    try {
      let headers: HeadersInit = {}
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      // Fetch classrooms
      const classroomsResponse = await fetch('/api/classrooms', { headers })
      const { classrooms: classroomsData } = await classroomsResponse.json()
      setClassrooms(classroomsData || [])

      // Fetch teachers
      const teachersResponse = await fetch('/api/users?role=teacher', { headers })
      const teachersData = await teachersResponse.json()
      setTeachers(Array.isArray(teachersData) ? teachersData : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassroom || !selectedTeacher) return

    setLoading(true)

    try {
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const response = await fetch(`/api/classrooms/${selectedClassroom}/assign-teacher`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ teacherId: selectedTeacher }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Error assigning teacher",
          description: data.error || 'Failed to assign teacher',
        });
        return;
      }

      toast({
        title: "Teacher assigned successfully",
        description: "The teacher has been assigned to the classroom.",
      })

      setSelectedClassroom('')
      setSelectedTeacher('')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error assigning teacher",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Teacher to Classroom</DialogTitle>
          <DialogDescription>
            Select a classroom and teacher to create the assignment.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Classroom</label>
            <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
              <SelectTrigger>
                <SelectValue placeholder="Select a classroom" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Teacher</label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Select a teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button 
              type="submit" 
              disabled={loading || !selectedClassroom || !selectedTeacher}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Teacher'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
