-- Migration: Add classroom_id to profiles for student-classroom association
ALTER TABLE public.profiles ADD COLUMN classroom_id UUID REFERENCES public.classrooms(id);

-- Optional: If you want to enforce that only students have classroom_id, add a check constraint
-- ALTER TABLE public.profiles ADD CONSTRAINT student_classroom_only CHECK (
--   (role = 'student' AND classroom_id IS NOT NULL) OR (role != 'student' AND classroom_id IS NULL)
-- );

-- Policy: Allow teachers to view students in their classrooms
CREATE POLICY "Teachers can view students in their classrooms" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'teacher' AND
    role = 'student' AND
    classroom_id IN (
      SELECT classroom_id FROM public.teacher_classroom WHERE teacher_id = auth.uid()
    )
  );

-- Policy: Students can only view their own profile
-- (already exists, but ensure it is not broken by new column)
