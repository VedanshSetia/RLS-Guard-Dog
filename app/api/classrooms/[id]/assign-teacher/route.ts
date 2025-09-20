import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/integrations/supabase/client'

const admin = supabaseAdmin;
if (!admin) throw new Error('supabaseAdmin is not available server-side');

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { teacherId } = await request.json();
    const classroomId = params.id;
    console.log('[assign-teacher] Incoming request:', { teacherId, classroomId });

    if (!teacherId) {
      console.log('[assign-teacher] No teacherId provided');
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    // Check if user is authenticated and has head_teacher role using Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('[assign-teacher] Authorization header:', authHeader);
    const token = authHeader?.split(' ')[1];
    console.log('[assign-teacher] Extracted token:', token);
    if (!token) {
      console.log('[assign-teacher] No token found');
      return NextResponse.json(
        { error: 'Unauthorized', debug: 'No token in Authorization header' },
        { status: 401 }
      );
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    console.log('[assign-teacher] Supabase getUser result:', { user, userError });
    if (!user) {
      console.log('[assign-teacher] No user found for token');
      return NextResponse.json(
        { error: 'Unauthorized', debug: { userError } },
        { status: 401 }
      );
    }

    if (!admin) {
      throw new Error('supabaseAdmin is not available server-side');
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    console.log('[assign-teacher] Profile lookup:', { profile, profileError });
    if (profile?.role !== 'head_teacher') {
      console.log('[assign-teacher] User is not head_teacher:', profile);
      return NextResponse.json(
        { error: 'Only head teachers can assign teachers to classrooms', debug: { profile } },
        { status: 403 }
      );
    }

    // Check if teacher exists and has teacher role
    const { data: teacher } = await admin
      .from('profiles')
      .select('role')
      .eq('id', teacherId)
      .single();

    if (!teacher || teacher.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Invalid teacher' },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await admin
      .from('teacher_classroom')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('classroom_id', classroomId)
      .maybeSingle();

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Teacher is already assigned to this classroom' },
        { status: 400 }
      );
    }

    const { data: assignment, error } = await admin
      .from('teacher_classroom')
      .insert({
        teacher_id: teacherId,
        classroom_id: classroomId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error assigning teacher to classroom:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}