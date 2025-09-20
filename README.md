# RLS Guard Dog - Student Progress Management System

A comprehensive Next.js 13 application for managing student progress in educational institutions, built with Supabase authentication and MongoDB for analytics.

## Features

- **Role-based Authentication**: Head Teachers, Teachers, and Students with different access levels
- **Classroom Management**: Create and manage classrooms
- **User Management**: Add teachers and students with temporary passwords
- **Progress Tracking**: Record and view student assignment scores
- **Analytics Dashboard**: View classroom averages and performance metrics
- **Real-time Updates**: MongoDB integration for calculating class averages

## Tech Stack

- **Frontend**: Next.js 13 with App Router, TypeScript, Tailwind CSS
- **UI Components**: Radix UI with shadcn/ui
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Analytics**: MongoDB
- **State Management**: React Query

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- MongoDB account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rls-guard-dog
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
MONGODB_URI=your_mongodb_connection_string
```

4. Set up the database:
Run the Supabase migration files in your Supabase dashboard or use the Supabase CLI.

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                          # Next.js 13 App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── classrooms/           # Classroom management
│   │   ├── users/                # User management
│   │   ├── progress/             # Progress tracking
│   │   └── averages/             # Analytics and averages
│   ├── components/               # React components
│   │   ├── dashboards/           # Dashboard components
│   │   └── providers/            # Context providers
│   ├── head-teacher/             # Head teacher dashboard
│   ├── teacher/                  # Teacher dashboard
│   ├── student/                  # Student dashboard
│   └── login/                    # Login page
├── components/                   # Shared UI components
├── src/                          # Legacy components (to be migrated)
└── lib/                          # Utility functions
```

## User Roles

### Head Teacher
- Create and manage classrooms
- Add teachers and students
- Assign teachers to classrooms
- View all classroom averages
- Manage school-wide data

### Teacher
- View assigned classrooms
- Add student progress records
- View classroom averages
- Manage student scores

### Student
- View personal progress
- See assignment scores
- Track performance trends

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Classrooms
- `GET /api/classrooms` - List classrooms (role-based filtering)
- `POST /api/classrooms` - Create new classroom (head teachers only)
- `POST /api/classrooms/[id]/assign-teacher` - Assign teacher to classroom

### Users
- `POST /api/users` - Create new user (head teachers only)

### Progress
- `GET /api/progress` - Get progress records (role-based filtering)
- `POST /api/progress` - Add new progress record

### Analytics
- `GET /api/averages` - Get classroom averages
- `POST /api/averages/calculate` - Calculate averages for a classroom

## Database Schema

### Supabase Tables
- `profiles` - User profiles with roles
- `classrooms` - Classroom information
- `teacher_classroom` - Teacher-classroom assignments
- `progress` - Student progress records

### MongoDB Collections
- `classroom-averages` - Calculated classroom averages

## Deployment

### Environment Variables for Production
Make sure to set these environment variables in your deployment platform:

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key
MONGODB_URI=your_production_mongodb_connection_string
```

### Deploy to Vercel
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set the environment variables in Vercel dashboard
4. Deploy

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.