'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  School, 
  GraduationCap, 
  BarChart3,
  TrendingUp,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/app/components/providers/auth-provider'
import { supabase } from '@/lib/integrations/supabase/client'
import { AddProgressDialog } from '@/components/AddProgressDialog'

interface ClassroomInfo {
  id: string
  name: string
  student_count: number
  average_score: number
  students: StudentInfo[]
}

interface StudentInfo {
  id: string
  first_name: string
  last_name: string
  email: string
  classroom_id?: string
}

interface StudentProgress {
  id: string
  student_name: string
  assignment_name: string
  score: number
  date_recorded: string
  classroom_name: string
}

export default function TeacherDashboard() {
  const { profile, user } = useAuth()
  const [classrooms, setClassrooms] = useState<ClassroomInfo[]>([])
  const [recentProgress, setRecentProgress] = useState<StudentProgress[]>([])
  const [showAddProgress, setShowAddProgress] = useState(false)
  const [stats, setStats] = useState({
    totalClassrooms: 0,
    totalStudents: 0,
  })

  const fetchTeacherData = async () => {
    if (!user) return;

    try {
      // Always get a fresh session/token for every API call
      const getHeaders = async (): Promise<HeadersInit> => {
        const session = (await supabase.auth.getSession()).data.session;
        const token = session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
      };

      // Fetch assigned classrooms
      const classroomsResponse = await fetch('/api/classrooms', { headers: await getHeaders() });
      const { classrooms: classroomData } = await classroomsResponse.json();

      // For each classroom, get student count, average score, and students
      const classroomInfo: ClassroomInfo[] = [];

      for (const classroom of classroomData || []) {
        // Get student count and average score from progress
        const progressResponse = await fetch(`/api/progress?classroomId=${classroom.id}`, { headers: await getHeaders() });
        const { progress: progressData } = await progressResponse.json();

        // Fetch all students assigned to this classroom (by classroom_id)
        let students: StudentInfo[] = [];
        try {
          const studentsResponse = await fetch(`/api/users?role=student&classroomId=${classroom.id}`, { headers: await getHeaders() });
          const studentsJson = await studentsResponse.json();
          if (Array.isArray(studentsJson)) {
            students = studentsJson;
          } else if (studentsJson && typeof studentsJson === 'object') {
            students = [studentsJson];
          }
        } catch (e) {
          students = [];
        }

        // Only include progress where the student's classroom_id matches this classroom (using filtered students)
        let filteredProgress: any[] = [];
        if (progressData && progressData.length > 0) {
          const studentIdsSet = new Set(students.map(s => s.id));
          filteredProgress = progressData.filter((p: any) => studentIdsSet.has(p.student_id));
        }
        const averageScore = filteredProgress.length > 0
          ? filteredProgress.reduce((sum: number, p: any) => sum + (p.score || 0), 0) / filteredProgress.length
          : 0;

        classroomInfo.push({
          id: classroom.id,
          name: classroom.name,
          student_count: students.length,
          average_score: averageScore,
          students,
        });
      }

      setClassrooms(classroomInfo);
      // Calculate unique students across all classrooms
      const uniqueStudentIdsAll = new Set(
        classroomInfo.flatMap(c => c.students.map(s => s.id))
      );
      setStats({
        totalClassrooms: classroomInfo.length,
        totalStudents: uniqueStudentIdsAll.size,
      });

      // Fetch recent progress entries for assigned classrooms
      const classroomIds = classroomInfo.map(c => c.id);
      if (classroomIds.length > 0) {
        const recentProgressResponse = await fetch('/api/progress', { headers: await getHeaders() });
        const { progress: progressData } = await recentProgressResponse.json();

        // Map progress entries to include student_name and classroom_name
        const studentsById: Record<string, StudentInfo> = {};
        classroomInfo.forEach(c => {
          c.students.forEach(s => {
            studentsById[s.id] = s;
          });
        });
        const classroomsById: Record<string, ClassroomInfo> = Object.fromEntries(classroomInfo.map(c => [c.id, c]));

        const recentProgressData = (progressData || []).slice(0, 10).map((p: any) => ({
          ...p,
          student_name: studentsById[p.student_id]
            ? `${studentsById[p.student_id].first_name} ${studentsById[p.student_id].last_name}`
            : 'Unknown Student',
          classroom_name: classroomsById[p.classroom_id]?.name || 'Unknown Classroom',
        }));
        setRecentProgress(recentProgressData);
      }

    } catch (error) {
      console.error('Error fetching teacher data:', error);
    }
  }

  useEffect(() => {
    fetchTeacherData()
  }, [user])

  // Optimistic update: add new progress entry to recentProgress
  const onSuccess = (newProgress?: any) => {
    if (newProgress) {
      // Enrich the new progress entry with student_name and classroom_name
      let student_name = 'Unknown Student';
      let classroom_name = 'Unknown Classroom';
      const classroom = classrooms.find(c => c.id === newProgress.classroom_id);
      if (classroom) {
        classroom_name = classroom.name;
        const student = classroom.students.find(s => s.id === newProgress.student_id);
        if (student) {
          student_name = `${student.first_name} ${student.last_name}`;
        }
      }
      setRecentProgress((prev) => [{ ...newProgress, student_name, classroom_name }, ...prev].slice(0, 10));
    }
    fetchTeacherData();
  }

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

      {/* Classroom Performance + Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            My Classroom Performance
          </CardTitle>
          <CardDescription>
            Average scores and students for your assigned classrooms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classrooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No classrooms assigned yet. Contact your head teacher to get classroom assignments.
            </div>
          ) : (
            <div className="space-y-6">
              {classrooms.map((classroom) => (
                <div key={classroom.id} className="border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
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
                  {/* Students List */}
                  <div className="mt-3">
                    <p className="font-semibold text-sm mb-1">Students:</p>
                    {(!Array.isArray(classroom.students) || classroom.students.length === 0) ? (
                      <span className="text-xs text-muted-foreground">No students assigned to this classroom.</span>
                    ) : (
                      <ul className="list-disc ml-6">
                        {classroom.students.map((student) => (
                          <li key={student.id} className="text-sm">
                            {student.first_name} {student.last_name} <span className="text-muted-foreground text-xs">({student.email})</span>
                          </li>
                        ))}
                      </ul>
                    )}
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
  )
}
