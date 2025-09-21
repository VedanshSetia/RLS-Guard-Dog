import { NextRequest, NextResponse } from 'next/server'

import { supabase, supabaseAdmin } from '@/lib/integrations/supabase/client'

if (!supabaseAdmin) throw new Error('supabaseAdmin is not available server-side');

export async function GET(request: NextRequest) {
  try {
    // Extract access token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to get user from token
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and role
  const { data: profile } = await supabaseAdmin!
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single();
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

  let progress: any[] = [];
    // Students can only see their own progress
    if (profile.role === 'student') {
  const { data: studentProgressRaw } = await supabaseAdmin!
        .from('progress')
        .select('*')
        .eq('student_id', user.id);
      progress = Array.isArray(studentProgressRaw) ? studentProgressRaw : [];
    }
    // Teachers can see progress for students in their classrooms
    else if (profile.role === 'teacher') {
  const { data: teacherClassroomsRaw } = await supabaseAdmin!
        .from('teacher_classroom')
        .select('classroom_id')
        .eq('teacher_id', user.id);
      const teacherClassrooms = Array.isArray(teacherClassroomsRaw) ? teacherClassroomsRaw : [];
      if (teacherClassrooms.length > 0) {
        const classroomIds = teacherClassrooms.map(tc => tc.classroom_id);
  const { data: teacherProgressRaw } = await supabaseAdmin!
          .from('progress')
          .select('*')
          .in('classroom_id', classroomIds);
        progress = Array.isArray(teacherProgressRaw) ? teacherProgressRaw : [];
      } else {
        progress = [];
      }
    }
    // Head teachers can see all progress in their school
    else if (profile.role === 'head_teacher') {
  const { data: schoolClassroomsRaw } = await supabaseAdmin!
        .from('classrooms')
        .select('id')
        .eq('school_id', profile.school_id || '');
      const schoolClassrooms = Array.isArray(schoolClassroomsRaw) ? schoolClassroomsRaw : [];
      if (schoolClassrooms.length > 0) {
        const classroomIds = schoolClassrooms.map(c => c.id);
  const { data: headTeacherProgressRaw } = await supabaseAdmin!
          .from('progress')
          .select('*')
          .in('classroom_id', classroomIds);
        progress = Array.isArray(headTeacherProgressRaw) ? headTeacherProgressRaw : [];
      } else {
        progress = [];
      }
    } else {
      // Not authorized
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) throw new Error('supabaseAdmin is not available server-side');
  try {
    const { studentId, classroomId, assignmentName, score, dateRecorded } = await request.json();
    if (!studentId || !classroomId || !assignmentName || score === undefined) {
      return NextResponse.json(
        { error: 'Student ID, classroom ID, assignment name, and score are required' },
        { status: 400 }
      );
    }

    // Extract access token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client to get user from token
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile and role
  const { data: profile } = await supabaseAdmin!
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Only teachers and head teachers can add progress
    if (profile?.role !== 'teacher' && profile?.role !== 'head_teacher') {
      return NextResponse.json(
        { error: 'Only teachers and head teachers can add progress' },
        { status: 403 }
      );
    }

    // If user is teacher, check if they're assigned to this classroom
    if (profile?.role === 'teacher') {
  const { data: teacherClassroomsRaw } = await supabaseAdmin!
        .from('teacher_classroom')
        .select('classroom_id')
        .eq('teacher_id', user.id);
      const teacherClassrooms = Array.isArray(teacherClassroomsRaw) ? teacherClassroomsRaw : [];
      const classroomIds = teacherClassrooms.map(tc => tc.classroom_id);
      if (!classroomIds.includes(classroomId)) {
        return NextResponse.json(
          { error: 'You are not assigned to this classroom' },
          { status: 403 }
        );
      }
    }

    // Insert progress
  const { data: progress, error } = await supabaseAdmin!
      .from('progress')
      .insert([
        {
          student_id: studentId,
          classroom_id: classroomId,
          assignment_name: assignmentName,
          score,
          date_recorded: dateRecorded || new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Update MongoDB with new average calculation (non-blocking)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/averages/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId }),
      });
    } catch (avgError) {
      console.error('Error updating averages:', avgError);
      // Don't fail the request if average calculation fails
    }

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Error creating progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

