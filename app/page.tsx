import { redirect } from 'next/navigation'
import { supabase } from '@/lib/integrations/supabase/client'

export default async function HomePage() {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Redirect based on user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role === 'head_teacher') {
    redirect('/head-teacher')
  } else if (profile?.role === 'teacher') {
    redirect('/teacher')
  } else if (profile?.role === 'student') {
    redirect('/student')
  }

  redirect('/login')
}
