'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/integrations/supabase/client'
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

interface AddProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newProgress?: any) => void
}

interface Classroom {
  id: string
  name: string
}

interface Student {
  id: string
  first_name: string
  last_name: string
}

export function AddProgressDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: AddProgressDialogProps) {
  const [formData, setFormData] = useState({
    studentId: '',
    classroomId: '',
    assignmentName: '',
    score: '',
    dateRecorded: new Date().toISOString().split('T')[0],
  })
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchClassrooms = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch('/api/classrooms', { headers });
      const { classrooms: classroomsData } = await response.json();
      setClassrooms(classroomsData || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  }

  const fetchStudents = async (classroomId: string) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      // Instead of using progress, fetch students directly from /api/users
      const response = await fetch(`/api/users?role=student&classroomId=${classroomId}`, { headers });
      const studentsData = await response.json();
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }

  useEffect(() => {
    if (open) {
      fetchClassrooms()
    }
  }, [open])

  useEffect(() => {
    if (formData.classroomId) {
      fetchStudents(formData.classroomId)
    } else {
      setStudents([])
    }
  }, [formData.classroomId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          studentId: formData.studentId,
          classroomId: formData.classroomId,
          assignmentName: formData.assignmentName,
          score: parseInt(formData.score),
          dateRecorded: formData.dateRecorded,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Error adding progress",
          description: data.error || 'Failed to add progress',
        });
        return;
      }

      toast({
        title: "Progress added successfully",
        description: "The student's progress has been recorded.",
      });

      setFormData({
        studentId: '',
        classroomId: '',
        assignmentName: '',
        score: '',
        dateRecorded: new Date().toISOString().split('T')[0],
      });
      onOpenChange(false);
      // Pass the new progress entry to the parent for optimistic update
      if (data && data.progress) {
        onSuccess(data.progress);
      } else {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding progress",
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
          <DialogTitle>Add Student Progress</DialogTitle>
          <DialogDescription>
            Record a student&apos;s assignment score and progress.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="classroom">Classroom</Label>
            <Select value={formData.classroomId} onValueChange={(value) => setFormData({ ...formData, classroomId: value, studentId: '' })}>
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
            <Label htmlFor="student">Student</Label>
            <Select value={formData.studentId} onValueChange={(value) => setFormData({ ...formData, studentId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment">Assignment Name</Label>
            <Input
              id="assignment"
              value={formData.assignmentName}
              onChange={(e) => setFormData({ ...formData, assignmentName: e.target.value })}
              placeholder="e.g., Math Quiz Chapter 5"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="score">Score (%)</Label>
            <Input
              id="score"
              type="number"
              min="0"
              max="100"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              placeholder="85"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date Recorded</Label>
            <Input
              id="date"
              type="date"
              value={formData.dateRecorded}
              onChange={(e) => setFormData({ ...formData, dateRecorded: e.target.value })}
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
            <Button 
              type="submit" 
              disabled={loading || !formData.studentId || !formData.classroomId}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Progress'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
