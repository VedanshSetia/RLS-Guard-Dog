'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  School, 
  GraduationCap, 
  BarChart3,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/app/components/providers/auth-provider'
import { CreateClassroomDialog } from '@/components/CreateClassroomDialog'
import { CreateUserDialog } from '@/components/CreateUserDialog'
import { AssignTeacherDialog } from '@/components/AssignTeacherDialog'

interface ClassroomAverage {
  classroomId: string
  classroomName: string
  average: number
  totalAssignments: number
}

export default function HeadTeacherDashboard() {
  const { profile, session } = useAuth()
  const [stats, setStats] = useState({
    totalClassrooms: 0,
    totalTeachers: 0,
    totalStudents: 0,
  })
  const [teachers, setTeachers] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [classroomAverages, setClassroomAverages] = useState<ClassroomAverage[]>([])
  const [showCreateClassroom, setShowCreateClassroom] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showAssignTeacher, setShowAssignTeacher] = useState(false)
  const [userType, setUserType] = useState<'teacher' | 'student'>('teacher')

  const fetchStats = async () => {
    try {
      // Always pass a valid HeadersInit object
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      // Fetch classroom count with Authorization header
      const response = await fetch('/api/classrooms', { headers });

      const { classrooms: classroomList, error: classError, debug } = await response.json();
      if (!response.ok) {
        console.error('Error fetching classrooms:', classError, debug);
        setStats((s) => ({ ...s, totalClassrooms: 0 }));
        setClassrooms([]);
        return;
      }
      setClassrooms(Array.isArray(classroomList) ? classroomList : []);

      const teachersResponse = await fetch('/api/users?role=teacher', { headers })
      const studentsResponse = await fetch('/api/users?role=student', { headers })
      const teachers = await teachersResponse.json()
      const students = await studentsResponse.json()

      setStats({
        totalClassrooms: Array.isArray(classroomList) ? classroomList.length : 0,
        totalTeachers: Array.isArray(teachers) ? teachers.length : 0,
        totalStudents: Array.isArray(students) ? students.length : 0,
      })
      setTeachers(Array.isArray(teachers) ? teachers : [])
      setStudents(Array.isArray(students) ? students : [])
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchClassroomAverages = async () => {
    try {
      const response = await fetch('/api/averages')
      const { averages } = await response.json()
      
      setClassroomAverages(averages || [])
    } catch (error) {
      console.error('Error fetching classroom averages:', error)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchClassroomAverages()
  }, [])

  const handleCreateUser = (type: 'teacher' | 'student') => {
    setUserType(type)
    setShowCreateUser(true)
  }

  const onSuccess = () => {
    fetchStats()
    fetchClassroomAverages()
  }

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

      {/* Top: Lists of all classrooms, teachers, students */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Classrooms</CardTitle>
          </CardHeader>
          <CardContent>
            {classrooms.length === 0 ? (
              <div className="text-muted-foreground">No classrooms found.</div>
            ) : (
              <ul className="space-y-2">
                {classrooms.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <School className="h-4 w-4 text-muted-foreground" />
                    <span>{c.name || c.classroom_name || c.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <div className="text-muted-foreground">No teachers found.</div>
            ) : (
              <ul className="space-y-2">
                {teachers.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{t.first_name} {t.last_name} ({t.email})</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-muted-foreground">No students found.</div>
            ) : (
              <ul className="space-y-2">
                {students.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>{s.first_name} {s.last_name} ({s.email})</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards (summary) */}
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

      {/* Classroom Performance Overview (unchanged) */}
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
                <div key={classroom.classroomId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <School className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{classroom.classroomName}</p>
                      <p className="text-sm text-muted-foreground">
                        {classroom.totalAssignments} assignments
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={classroom.average >= 85 ? "default" : classroom.average >= 70 ? "secondary" : "destructive"}>
                      {classroom.average.toFixed(1)}% avg
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
  )
}
