// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// @ts-ignore: Deno remote import
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { role, teacherId } = await req.json();

    let query = supabase
      .from('classrooms')
      .select(`
        id,
        name,
        progress (
          score,
          student_id
        )
      `);

    // If teacher role, only get their assigned classrooms
    if (role === 'teacher' && teacherId) {
      query = query.eq('teacher_classroom.teacher_id', teacherId);
    }

    const { data: classrooms, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate averages for each classroom
    const averages = classrooms?.map(classroom => {
      const scores = classroom.progress?.map(p => p.score).filter(Boolean) || [];
      const uniqueStudents = new Set(classroom.progress?.map(p => p.student_id) || []).size;
      
      return {
        classroom_id: classroom.id,
        classroom_name: classroom.name,
        average_score: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
        total_students: uniqueStudents,
      };
    }) || [];

    return new Response(
      JSON.stringify({ averages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});