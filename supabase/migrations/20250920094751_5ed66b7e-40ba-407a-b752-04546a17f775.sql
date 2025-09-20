-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'head_teacher');

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'student',
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    school_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classrooms table
CREATE TABLE public.classrooms (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    school_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teacher_classroom junction table
CREATE TABLE public.teacher_classroom (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(teacher_id, classroom_id)
);

-- Create progress table for student records
CREATE TABLE public.progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    score DECIMAL(5,2),
    assignment_name TEXT NOT NULL,
    date_recorded TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_classroom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Create function to check if user is teacher of a classroom
CREATE OR REPLACE FUNCTION public.is_teacher_of_classroom(user_id UUID, classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.teacher_classroom 
        WHERE teacher_id = user_id AND teacher_classroom.classroom_id = classroom_id
    );
$$;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Head teachers can view all profiles" ON public.profiles
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'head_teacher');

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Head teachers can update all profiles" ON public.profiles
    FOR UPDATE USING (public.get_user_role(auth.uid()) = 'head_teacher');

CREATE POLICY "Head teachers can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'head_teacher');

CREATE POLICY "Head teachers can delete profiles" ON public.profiles
    FOR DELETE USING (public.get_user_role(auth.uid()) = 'head_teacher');

-- RLS Policies for classrooms table
CREATE POLICY "Head teachers can manage all classrooms" ON public.classrooms
    FOR ALL USING (public.get_user_role(auth.uid()) = 'head_teacher');

CREATE POLICY "Teachers can view their assigned classrooms" ON public.classrooms
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'teacher' AND 
        EXISTS (
            SELECT 1 FROM public.teacher_classroom 
            WHERE teacher_id = auth.uid() AND classroom_id = id
        )
    );

-- RLS Policies for teacher_classroom table
CREATE POLICY "Head teachers can manage teacher assignments" ON public.teacher_classroom
    FOR ALL USING (public.get_user_role(auth.uid()) = 'head_teacher');

CREATE POLICY "Teachers can view their own assignments" ON public.teacher_classroom
    FOR SELECT USING (teacher_id = auth.uid());

-- RLS Policies for progress table
CREATE POLICY "Students can view their own progress" ON public.progress
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view progress of students in their classrooms" ON public.progress
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'teacher' AND
        public.is_teacher_of_classroom(auth.uid(), classroom_id)
    );

CREATE POLICY "Teachers can update progress of students in their classrooms" ON public.progress
    FOR UPDATE USING (
        public.get_user_role(auth.uid()) = 'teacher' AND
        public.is_teacher_of_classroom(auth.uid(), classroom_id)
    );

CREATE POLICY "Teachers can insert progress for students in their classrooms" ON public.progress
    FOR INSERT WITH CHECK (
        public.get_user_role(auth.uid()) = 'teacher' AND
        public.is_teacher_of_classroom(auth.uid(), classroom_id)
    );

CREATE POLICY "Head teachers can manage all progress" ON public.progress
    FOR ALL USING (public.get_user_role(auth.uid()) = 'head_teacher');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON public.classrooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_progress_updated_at
    BEFORE UPDATE ON public.progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );
    RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();