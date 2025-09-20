import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/integrations/supabase/client'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const { classroomId } = await request.json()
    
    if (!classroomId) {
      return NextResponse.json(
        { error: 'Classroom ID is required' },
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

    // Only teachers and head teachers can calculate averages
    if (profile?.role !== 'teacher' && profile?.role !== 'head_teacher') {
      return NextResponse.json(
        { error: 'Only teachers and head teachers can calculate averages' },
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

    // Get all progress for this classroom
    const { data: progressData, error } = await supabase
      .from('progress')
      .select('score, student_id, assignment_name')
      .eq('classroom_id', classroomId)
      .not('score', 'is', null)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!progressData || progressData.length === 0) {
      return NextResponse.json({
        success: true,
        average: null,
        message: 'No progress data found for this classroom'
      })
    }

    // Calculate average
    const totalScore = progressData.reduce((sum, record) => sum + (record.score || 0), 0)
    const average = totalScore / progressData.length

    // Get classroom name
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('name')
      .eq('id', classroomId)
      .single()

    // Store in MongoDB
    const client = await clientPromise
    const db = client.db('rls-guard-dog')
    const averagesCollection = db.collection('classroom-averages')

    const averageDoc = {
      classroomId,
      classroomName: classroom?.name || 'Unknown Classroom',
      average,
      totalAssignments: progressData.length,
      lastUpdated: new Date(),
    }

    await averagesCollection.replaceOne(
      { classroomId },
      averageDoc,
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      average,
      classroomName: classroom?.name,
      totalAssignments: progressData.length
    })
  } catch (error) {
    console.error('Error calculating averages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
