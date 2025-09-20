import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  School, 
  GraduationCap, 
  BarChart3,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CreateClassroomDialog } from '@/components/CreateClassroomDialog';
import { CreateUserDialog } from '@/components/CreateUserDialog';
import { AssignTeacherDialog } from '@/components/AssignTeacherDialog';

interface ClassroomAverage {
  classroom_id: string;
  classroom_name: string;
  average_score: number;
  total_students: number;
}

export default function HeadTeacherDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalClassrooms: 0,
    totalTeachers: 0,
    totalStudents: 0,
  });
  const [classroomAverages, setClassroomAverages] = useState<ClassroomAverage[]>([]);
  const [showCreateClassroom, setShowCreateClassroom] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [userType, setUserType] = useState<'teacher' | 'student'>('teacher');

  const fetchStats = async () => {
    try {
      // Fetch classroom count
      const { count: classroomCount } = await supabase
        .from('classrooms')
        .select('*', { count: 'exact', head: true });

      // Fetch teacher count
      const { count: teacherCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher');

      // Fetch student count
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      setStats({
        totalClassrooms: classroomCount || 0,
        totalTeachers: teacherCount || 0,
        totalStudents: studentCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchClassroomAverages = async () => {
    try {
      // Call edge function to get classroom averages
      const { data, error } = await supabase.functions.invoke('get-classroom-averages', {
        body: { role: 'head_teacher' }
      });

      if (error) {
        console.error('Error fetching classroom averages:', error);
        return;
      }

      setClassroomAverages(data?.averages || []);
    } catch (error) {
      console.error('Error fetching classroom averages:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchClassroomAverages();
  }, []);

  const handleCreateUser = (type: 'teacher' | 'student') => {
    setUserType(type);
    setShowCreateUser(true);
  };

  const onSuccess = () => {
    fetchStats();
    fetchClassroomAverages();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Head Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.first_name} {profile?.last_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateClassroom(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Classroom
          </Button>
          <Button variant="outline" onClick={() => handleCreateUser('teacher')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
          <Button variant="outline" onClick={() => handleCreateUser('student')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
          <Button variant="outline" onClick={() => setShowAssignTeacher(true)}>
            <Users className="mr-2 h-4 w-4" />
            Assign Teachers
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classrooms</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClassrooms}</div>
            <p className="text-xs text-muted-foreground">
              Active learning spaces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              Registered educators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled learners
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classroom Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Classroom Performance Overview
          </CardTitle>
          <CardDescription>
            Average scores across all classrooms in your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classroomAverages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No performance data available yet. Add some student progress records to see classroom averages.
            </div>
          ) : (
            <div className="space-y-4">
              {classroomAverages.map((classroom) => (
                <div key={classroom.classroom_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <School className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{classroom.classroom_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {classroom.total_students} students
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={classroom.average_score >= 85 ? "default" : classroom.average_score >= 70 ? "secondary" : "destructive"}>
                      {classroom.average_score.toFixed(1)}% avg
                    </Badge>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateClassroomDialog 
        open={showCreateClassroom} 
        onOpenChange={setShowCreateClassroom}
        onSuccess={onSuccess}
      />
      
      <CreateUserDialog 
        open={showCreateUser} 
        onOpenChange={setShowCreateUser}
        userType={userType}
        onSuccess={onSuccess}
      />
      
      <AssignTeacherDialog 
        open={showAssignTeacher} 
        onOpenChange={setShowAssignTeacher}
        onSuccess={onSuccess}
      />
    </div>
  );
}