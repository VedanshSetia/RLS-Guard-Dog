import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  School, 
  GraduationCap, 
  BarChart3,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AddProgressDialog } from '@/components/AddProgressDialog';

interface ClassroomInfo {
  id: string;
  name: string;
  student_count: number;
  average_score: number;
}

interface StudentProgress {
  id: string;
  student_name: string;
  assignment_name: string;
  score: number;
  date_recorded: string;
  classroom_name: string;
}

export default function TeacherDashboard() {
  const { profile, user } = useAuth();
  const [classrooms, setClassrooms] = useState<ClassroomInfo[]>([]);
  const [recentProgress, setRecentProgress] = useState<StudentProgress[]>([]);
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [stats, setStats] = useState({
    totalClassrooms: 0,
    totalStudents: 0,
  });

  const fetchTeacherData = async () => {
    if (!user) return;

    try {
      // Fetch assigned classrooms
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          teacher_classroom!inner(teacher_id)
        `)
        .eq('teacher_classroom.teacher_id', user.id);

      if (classroomError) {
        console.error('Error fetching classrooms:', classroomError);
        return;
      }

      // For each classroom, get student count and average score
      const classroomInfo: ClassroomInfo[] = [];
      
      for (const classroom of classroomData || []) {
        // Get student count in this classroom
        const { count: studentCount } = await supabase
          .from('progress')
          .select('student_id', { count: 'exact', head: true })
          .eq('classroom_id', classroom.id);

        // Get average score for this classroom
        const { data: progressData } = await supabase
          .from('progress')
          .select('score')
          .eq('classroom_id', classroom.id);

        const averageScore = progressData && progressData.length > 0
          ? progressData.reduce((sum, p) => sum + (p.score || 0), 0) / progressData.length
          : 0;

        classroomInfo.push({
          id: classroom.id,
          name: classroom.name,
          student_count: studentCount || 0,
          average_score: averageScore,
        });
      }

      setClassrooms(classroomInfo);
      setStats({
        totalClassrooms: classroomInfo.length,
        totalStudents: classroomInfo.reduce((sum, c) => sum + c.student_count, 0),
      });

      // Fetch recent progress entries for assigned classrooms
      const classroomIds = classroomInfo.map(c => c.id);
      if (classroomIds.length > 0) {
        const { data: progressData, error: progressError } = await supabase
          .from('progress')
          .select(`
            id,
            assignment_name,
            score,
            date_recorded,
            student:profiles!progress_student_id_fkey(first_name, last_name),
            classroom:classrooms(name)
          `)
          .in('classroom_id', classroomIds)
          .order('date_recorded', { ascending: false })
          .limit(10);

        if (progressError) {
          console.error('Error fetching progress:', progressError);
          return;
        }

        const formattedProgress: StudentProgress[] = progressData?.map(p => ({
          id: p.id,
          student_name: `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim(),
          assignment_name: p.assignment_name,
          score: p.score || 0,
          date_recorded: new Date(p.date_recorded).toLocaleDateString(),
          classroom_name: p.classroom?.name || '',
        })) || [];

        setRecentProgress(formattedProgress);
      }

    } catch (error) {
      console.error('Error fetching teacher data:', error);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  const onSuccess = () => {
    fetchTeacherData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.first_name} {profile?.last_name}
          </p>
        </div>
        <Button onClick={() => setShowAddProgress(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Progress
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Classrooms</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClassrooms}</div>
            <p className="text-xs text-muted-foreground">
              Assigned classrooms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Students across all classrooms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classroom Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            My Classroom Performance
          </CardTitle>
          <CardDescription>
            Average scores for your assigned classrooms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classrooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No classrooms assigned yet. Contact your head teacher to get classroom assignments.
            </div>
          ) : (
            <div className="space-y-4">
              {classrooms.map((classroom) => (
                <div key={classroom.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <School className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{classroom.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {classroom.student_count} students
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={classroom.average_score >= 85 ? "default" : classroom.average_score >= 70 ? "secondary" : "destructive"}>
                      {classroom.average_score > 0 ? `${classroom.average_score.toFixed(1)}% avg` : 'No data'}
                    </Badge>
                    {classroom.average_score > 0 && <TrendingUp className="h-4 w-4 text-green-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Progress Entries</CardTitle>
          <CardDescription>
            Latest progress records from your students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentProgress.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No progress entries yet. Add some student progress to see them here.
            </div>
          ) : (
            <div className="space-y-3">
              {recentProgress.map((progress) => (
                <div key={progress.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{progress.student_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {progress.assignment_name} • {progress.classroom_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={progress.score >= 85 ? "default" : progress.score >= 70 ? "secondary" : "destructive"}>
                      {progress.score}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress.date_recorded}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddProgressDialog 
        open={showAddProgress} 
        onOpenChange={setShowAddProgress}
        onSuccess={onSuccess}
      />
    </div>
  );
}