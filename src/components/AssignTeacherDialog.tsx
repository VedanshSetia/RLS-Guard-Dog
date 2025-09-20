import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Classroom {
  id: string;
  name: string;
}

interface AssignTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignTeacherDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: AssignTeacherDialogProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      // Fetch teachers
      const { data: teacherData, error: teacherError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'teacher');

      if (teacherError) {
        console.error('Error fetching teachers:', teacherError);
        return;
      }

      // Fetch classrooms
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, name');

      if (classroomError) {
        console.error('Error fetching classrooms:', classroomError);
        return;
      }

      setTeachers(teacherData || []);
      setClassrooms(classroomData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('teacher_classroom')
        .select('id')
        .eq('teacher_id', selectedTeacher)
        .eq('classroom_id', selectedClassroom)
        .single();

      if (existing) {
        toast({
          variant: "destructive",
          title: "Assignment already exists",
          description: "This teacher is already assigned to this classroom.",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('teacher_classroom')
        .insert([{
          teacher_id: selectedTeacher,
          classroom_id: selectedClassroom,
        }]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error assigning teacher",
          description: error.message,
        });
        return;
      }

      const teacher = teachers.find(t => t.id === selectedTeacher);
      const classroom = classrooms.find(c => c.id === selectedClassroom);

      toast({
        title: "Teacher assigned successfully",
        description: `${teacher?.first_name} ${teacher?.last_name} has been assigned to ${classroom?.name}.`,
      });

      setSelectedTeacher('');
      setSelectedClassroom('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error assigning teacher",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Teacher to Classroom</DialogTitle>
          <DialogDescription>
            Select a teacher and classroom to create a new assignment.
          </DialogDescription>
        </DialogHeader>
        
        {fetchLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher">Teacher</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name} ({teacher.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="classroom">Classroom</Label>
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom} required>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !selectedTeacher || !selectedClassroom}>
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
        )}
      </DialogContent>
    </Dialog>
  );
}