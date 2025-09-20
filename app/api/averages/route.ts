import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/integrations/supabase/client'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
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

    const client = await clientPromise
    const db = client.db('rls-guard-dog')
    const averagesCollection = db.collection('classroom-averages')

    let query: any = {}

    // Students can only see their own classroom average (if they're in one)
    if (profile?.role === 'student') {
      // Get student's classroom
      const { data: progress } = await supabase
        .from('progress')
        .select('classroom_id')
        .eq('student_id', session.user.id)
        .limit(1)
        .single()

      if (progress?.classroom_id) {
        query.classroomId = progress.classroom_id
      } else {
        return NextResponse.json({ averages: [] })
      }
    }
    // Teachers can see averages for their assigned classrooms
    else if (profile?.role === 'teacher') {
      const { data: teacherClassrooms } = await supabase
        .from('teacher_classroom')
        .select('classroom_id')
        .eq('teacher_id', session.user.id)

      if (teacherClassrooms && teacherClassrooms.length > 0) {
        const classroomIds = teacherClassrooms.map(tc => tc.classroom_id)
        query.classroomId = { $in: classroomIds }
      } else {
        return NextResponse.json({ averages: [] })
      }
    }
    // Head teachers can see averages for all classrooms in their school
    else if (profile?.role === 'head_teacher') {
      const { data: schoolClassrooms } = await supabase
        .from('classrooms')
        .select('id')
        .eq('school_id', profile.school_id || '')

      if (schoolClassrooms && schoolClassrooms.length > 0) {
        const classroomIds = schoolClassrooms.map(c => c.id)
        query.classroomId = { $in: classroomIds }
      }
    }

    // Apply classroom filter if provided
    if (classroomId) {
      query.classroomId = classroomId
    }

    const averages = await averagesCollection.find(query).toArray()

    return NextResponse.json({ averages })
  } catch (error) {
    console.error('Error fetching averages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
