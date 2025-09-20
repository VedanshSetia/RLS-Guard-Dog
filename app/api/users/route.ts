import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/integrations/supabase/client'

const admin = supabaseAdmin;
if (!admin) throw new Error('supabaseAdmin is not available server-side');
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    if (!role || (role !== 'teacher' && role !== 'student')) {
      return NextResponse.json({ error: 'Invalid or missing role' }, { status: 400 });
    }

    // Auth: Only head teachers can fetch users
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get head teacher's profile and school_id
    const { data: profile } = await admin!
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'head_teacher' || !profile.school_id) {
      return NextResponse.json({ error: 'Only head teachers can fetch users' }, { status: 403 });
    }

    // Fetch users with the requested role in the same school
    const { data: users, error } = await admin!
      .from('profiles')
      .select('id, first_name, last_name, email, role, school_id')
      .eq('role', role)
      .eq('school_id', profile.school_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

  // Return users as a flat array for frontend compatibility
  return NextResponse.json(Array.isArray(users) ? users : []);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // ...existing code...
  try {
  const { email, password, role, firstName, lastName, schoolId, mustChangePassword = false } = await request.json()
  console.log('CreateUserDialog payload:', { email, password, role, firstName, lastName, schoolId, mustChangePassword });
    if (!email || !password || !role || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, password, role, firstName, and lastName are required' },
        { status: 400 }
      )
    }

    // Defensive: Check if user already exists in profiles by email
    const { data: existingProfileByEmail } = await admin!
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    console.log('Existing profile by email:', existingProfileByEmail);
    if (existingProfileByEmail) {
      return NextResponse.json(
        { error: 'A user with this email already exists in profiles.' },
        { status: 409 }
      )
    }

    // Auth: Only head teachers can create users
    const authHeader = request.headers.get('authorization');
    console.log('Authorization header:', authHeader);
    const token = authHeader?.split(' ')[1];
    if (!token) {
      console.log('No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get head teacher's profile and school_id using admin client
    const { data: profile } = await admin!
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'head_teacher' || !profile.school_id) {
      return NextResponse.json(
        { error: 'Only head teachers can create users' },
        { status: 403 }
      )
    }

    // Create user with Supabase Auth (admin client)
    const { data: authData, error: authError } = await admin!.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    console.log('Supabase admin.createUser response:', { authData, authError });
    if (authData && authData.user) {
      console.log('New user ID from Supabase Auth:', authData.user.id);
    }

    if (authError) {
      // If duplicate error, return clear error and do not insert profile
      if (authError.message && authError.message.toLowerCase().includes('duplicate')) {
        return NextResponse.json(
          { error: 'A user with this email already exists in Auth.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Only insert profile if createUser succeeded and user.id is valid
    if (!authData || !authData.user || !authData.user.id) {
      return NextResponse.json(
        { error: 'User creation failed: no valid user id returned from Supabase Auth.', debug: { authData } },
        { status: 500 }
      )
    }

    // Defensive: Check if user already exists in profiles by user id (after authData is defined)
    const { data: existingProfileById } = await admin!
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();
    console.log('Duplicate check by user ID:', authData.user.id, existingProfileById);
    if (existingProfileById) {
      return NextResponse.json(
        { error: 'A user with this ID already exists in profiles.' },
        { status: 409 }
      )
    }

    const { error: profileError } = await admin!
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: role, // ensure correct role from request
        school_id: schoolId || profile.school_id,
        must_change_password: mustChangePassword,
      });

    if (profileError) {
      // Clean up the created user if profile creation fails
      await admin!.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: profileError.message, debug: { authData, profileError } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        role,
        firstName,
        lastName,
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
