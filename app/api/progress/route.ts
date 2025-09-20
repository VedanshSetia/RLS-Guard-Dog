import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/integrations/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const classroomId = searchParams.get('classroomId')

    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', session.user.id)
      .single()

    let query = supabase.from('progress').select('*')

    // Students can only see their own progress
    if (profile?.role === 'student') {
      query = query.eq('student_id', session.user.id)
    }
    // Teachers can see progress for students in their classrooms
    else if (profile?.role === 'teacher') {
      // Get classrooms assigned to this teacher
      const { data: teacherClassrooms } = await supabase
        .from('teacher_classroom')
        .select('classroom_id')
        .eq('teacher_id', session.user.id)

      if (teacherClassrooms && teacherClassrooms.length > 0) {
        const classroomIds = teacherClassrooms.map(tc => tc.classroom_id)
        query = query.in('classroom_id', classroomIds)
      } else {
        // No classrooms assigned, return empty array
        return NextResponse.json({ progress: [] })
      }
    }
    // Head teachers can see all progress in their school
    else if (profile?.role === 'head_teacher') {
      // Filter by school classrooms if needed
      const { data: schoolClassrooms } = await supabase
        .from('classrooms')
        .select('id')
        .eq('school_id', profile.school_id || '')

      if (schoolClassrooms && schoolClassrooms.length > 0) {
        const classroomIds = schoolClassrooms.map(c => c.id)
        query = query.in('classroom_id', classroomIds)
      }
    }

    // Apply additional filters if provided
    if (studentId) {
      query = query.eq('student_id', studentId)
    }
    if (classroomId) {
      query = query.eq('classroom_id', classroomId)
    }

    const { data: progress, error } = await query.order('date_recorded', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { studentId, classroomId, assignmentName, score, dateRecorded } = await request.json()
    
    if (!studentId || !classroomId || !assignmentName || score === undefined) {
      return NextResponse.json(
        { error: 'Student ID, classroom ID, assignment name, and score are required' },
        { status: 400 }
      )
    }

    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    // Only teachers and head teachers can add progress
    if (profile?.role !== 'teacher' && profile?.role !== 'head_teacher') {
      return NextResponse.json(
        { error: 'Only teachers and head teachers can add progress' },
        { status: 403 }
      )
    }

    // If user is teacher, check if they're assigned to this classroom
    if (profile?.role === 'teacher') {
      const { data: assignment } = await supabase
        .from('teacher_classroom')
        .select('id')
        .eq('teacher_id', session.user.id)
        .eq('classroom_id', classroomId)
        .single()

      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not assigned to this classroom' },
          { status: 403 }
        )
      }
    }

    const { data: progress, error } = await supabase
      .from('progress')
      .insert({
        student_id: studentId,
        classroom_id: classroomId,
        assignment_name: assignmentName,
        score,
        date_recorded: dateRecorded || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Update MongoDB with new average calculation
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/averages/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId }),
      })
    } catch (avgError) {
      console.error('Error updating averages:', avgError)
      // Don't fail the request if average calculation fails
    }

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error creating progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
