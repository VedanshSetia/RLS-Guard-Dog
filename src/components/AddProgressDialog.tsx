import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useAuth } from '@/contexts/AuthContext';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Classroom {
  id: string;
  name: string;
}

interface AddProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddProgressDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: AddProgressDialogProps) {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [assignmentName, setAssignmentName] = useState('');
  const [score, setScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const { toast } = useToast();

  const fetchClassrooms = async () => {
    if (!user) return;

    try {
      // Fetch classrooms assigned to this teacher
      const { data: classroomData, error } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          teacher_classroom!inner(teacher_id)
        `)
        .eq('teacher_classroom.teacher_id', user.id);

      if (error) {
        console.error('Error fetching classrooms:', error);
        return;
      }

      setClassrooms(classroomData || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchStudents = async (classroomId: string) => {
    try {
      // Get students who have progress records in this classroom
      const { data: studentData, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'student');

      if (error) {
        console.error('Error fetching students:', error);
        return;
      }

      setStudents(studentData || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchClassrooms();
    }
  }, [open, user]);

  useEffect(() => {
    if (selectedClassroom) {
      fetchStudents(selectedClassroom);
      setSelectedStudent(''); // Reset selected student when classroom changes
    }
  }, [selectedClassroom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('progress')
        .insert([{
          student_id: selectedStudent,
          classroom_id: selectedClassroom,
          assignment_name: assignmentName,
          score: parseFloat(score),
        }]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error adding progress",
          description: error.message,
        });
        return;
      }

      const student = students.find(s => s.id === selectedStudent);
      const classroom = classrooms.find(c => c.id === selectedClassroom);

      toast({
        title: "Progress added successfully",
        description: `Added ${assignmentName} score for ${student?.first_name} ${student?.last_name} in ${classroom?.name}.`,
      });

      // Reset form
      setSelectedClassroom('');
      setSelectedStudent('');
      setAssignmentName('');
      setScore('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding progress",
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
          <DialogTitle>Add Student Progress</DialogTitle>
          <DialogDescription>
            Record a new assignment score for a student in your classroom.
          </DialogDescription>
        </DialogHeader>
        
        {fetchLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="student">Student</Label>
              <Select 
                value={selectedStudent} 
                onValueChange={setSelectedStudent} 
                required
                disabled={!selectedClassroom}
              >
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
              <Label htmlFor="assignmentName">Assignment Name</Label>
              <Input
                id="assignmentName"
                value={assignmentName}
                onChange={(e) => setAssignmentName(e.target.value)}
                placeholder="e.g., Math Quiz 1, Essay Assignment"
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
                step="0.1"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="85.5"
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
                disabled={loading || !selectedClassroom || !selectedStudent}
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
        )}
      </DialogContent>
    </Dialog>
  );
}