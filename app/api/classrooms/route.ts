import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/integrations/supabase/client'

// Always use a safe reference for admin client
const admin = supabaseAdmin;
if (!admin) throw new Error('supabaseAdmin is not available server-side');

export async function GET(request: NextRequest) {
  try {
    // Extract and verify Supabase access token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', debug: 'No token in Authorization header' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', debug: { userError } }, { status: 401 });
    }

    // Use admin client to bypass RLS for profile fetch
    const { data: profile, error: profileError } = await admin!
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single();
    if (!profile) {
      return NextResponse.json({ error: 'No profile found', debug: { user, profileError } }, { status: 403 });
    }

    let query = admin!.from('classrooms').select('*');

    // Filter by school for head teachers
    if (profile.role === 'head_teacher' && profile.school_id) {
      query = query.eq('school_id', profile.school_id)
    }
    // For teachers, only show classrooms they're assigned to
    else if (profile.role === 'teacher') {
      // First get the classroom IDs for this teacher
      const { data: teacherClassrooms } = await admin!
        .from('teacher_classroom')
        .select('classroom_id')
        .eq('teacher_id', user.id);
      if (teacherClassrooms && teacherClassrooms.length > 0) {
        const classroomIds = teacherClassrooms.map(tc => tc.classroom_id);
        query = query.in('id', classroomIds);
      } else {
        // No classrooms assigned, return empty result
        query = query.eq('id', 'no-classrooms');
      }
    }
    // Students don't need to see classrooms directly
    else if (profile.role === 'student') {
      return NextResponse.json({ classrooms: [] })
    }

    const { data: classrooms, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ classrooms })
  } catch (error) {
    console.error('Error fetching classrooms:', error)
    return NextResponse.json(
      { error: 'Internal server error', debug: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, schoolId } = await request.json();
    console.log('API: classroom POST input', { name, schoolId });

    if (!name) {
      console.log('API: classroom POST error - name missing');
      return NextResponse.json(
        { error: 'Classroom name is required' },
        { status: 400 }
      );
    }

    // Extract and verify Supabase access token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      console.log('API: classroom POST error - no token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    console.log('API: user from token:', user, 'userError:', userError);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS for profile fetch
    const { data: profile, error: profileError } = await admin!
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single();
    console.log('API: profile for user.id', user.id, ':', profile, 'error:', profileError);

    if (profile?.role !== 'head_teacher') {
      console.log('API: Not a head_teacher, role is:', profile?.role);
      return NextResponse.json(
        { error: 'Only head teachers can create classrooms', debug: { user, profile } },
        { status: 403 }
      );
    }

    const insertPayload = {
      name,
      school_id: schoolId || profile.school_id || null,
    };
    console.log('API: classroom POST insert payload', insertPayload);

    const { data: classroom, error } = await admin!
      .from('classrooms')
      .insert(insertPayload)
      .select()
      .single();
    console.log('API: classroom POST insert result', { classroom, error });

    if (error || !classroom) {
      console.log('API: classroom POST error', error);
      return NextResponse.json(
        { error: error, classroom },
        { status: 500 }
      );
    }

    return NextResponse.json({ classroom });
  } catch (error) {
    console.error('Error creating classroom:', error);
    return NextResponse.json(
      { error: error },
      { status: 500 }
    );
  }
}
