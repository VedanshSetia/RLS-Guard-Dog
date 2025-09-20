import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  BarChart3,
  TrendingUp,
  Award,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProgressEntry {
  id: string;
  assignment_name: string;
  score: number;
  date_recorded: string;
  classroom_name: string;
}

interface ProgressStats {
  totalAssignments: number;
  averageScore: number;
  highestScore: number;
  recentTrend: 'up' | 'down' | 'stable';
}

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalAssignments: 0,
    averageScore: 0,
    highestScore: 0,
    recentTrend: 'stable',
  });

  const fetchStudentProgress = async () => {
    if (!user) return;

    try {
      // Fetch all progress entries for this student
      const { data: progressData, error } = await supabase
        .from('progress')
        .select(`
          id,
          assignment_name,
          score,
          date_recorded,
          classroom:classrooms(name)
        `)
        .eq('student_id', user.id)
        .order('date_recorded', { ascending: false });

      if (error) {
        console.error('Error fetching progress:', error);
        return;
      }

      const formattedProgress: ProgressEntry[] = progressData?.map(p => ({
        id: p.id,
        assignment_name: p.assignment_name,
        score: p.score || 0,
        date_recorded: new Date(p.date_recorded).toLocaleDateString(),
        classroom_name: p.classroom?.name || '',
      })) || [];

      setProgressEntries(formattedProgress);

      // Calculate stats
      if (formattedProgress.length > 0) {
        const scores = formattedProgress.map(p => p.score);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const highestScore = Math.max(...scores);

        // Calculate trend (compare last 3 vs previous 3 assignments)
        let recentTrend: 'up' | 'down' | 'stable' = 'stable';
        if (formattedProgress.length >= 6) {
          const recent3 = scores.slice(0, 3);
          const previous3 = scores.slice(3, 6);
          const recentAvg = recent3.reduce((sum, score) => sum + score, 0) / 3;
          const previousAvg = previous3.reduce((sum, score) => sum + score, 0) / 3;
          
          if (recentAvg > previousAvg + 2) recentTrend = 'up';
          else if (recentAvg < previousAvg - 2) recentTrend = 'down';
        }

        setStats({
          totalAssignments: formattedProgress.length,
          averageScore,
          highestScore,
          recentTrend,
        });
      }

    } catch (error) {
      console.error('Error fetching student progress:', error);
    }
  };

  useEffect(() => {
    fetchStudentProgress();
  }, [user]);

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    if (score >= 70) return 'outline';
    return 'destructive';
  };

  const getPerformanceMessage = () => {
    if (stats.averageScore >= 90) return "Excellent work! Keep it up!";
    if (stats.averageScore >= 80) return "Great job! You're doing well.";
    if (stats.averageScore >= 70) return "Good effort! Room for improvement.";
    return "Keep working hard. You can do better!";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.first_name} {profile?.last_name}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              Completed assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageScore > 0 ? `${stats.averageScore.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              {stats.recentTrend === 'up' && <TrendingUp className="mr-1 h-3 w-3 text-green-500" />}
              {stats.recentTrend === 'down' && <TrendingUp className="mr-1 h-3 w-3 text-red-500 rotate-180" />}
              {getPerformanceMessage()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.highestScore > 0 ? `${stats.highestScore}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Personal best
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            My Progress History
          </CardTitle>
          <CardDescription>
            Your recent assignment scores and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progressEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No progress entries yet. Your teachers will add your assignment scores here.
            </div>
          ) : (
            <div className="space-y-3">
              {progressEntries.map((progress) => (
                <div key={progress.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{progress.assignment_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {progress.classroom_name} • {progress.date_recorded}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={getScoreBadgeVariant(progress.score)}>
                      {progress.score}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      {progressEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>
              How you're performing across different areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Overall Performance</span>
                <Badge variant={getScoreBadgeVariant(stats.averageScore)}>
                  {stats.averageScore.toFixed(1)}% Average
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Recent Trend</span>
                <div className="flex items-center space-x-2">
                  {stats.recentTrend === 'up' && (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Improving</span>
                    </>
                  )}
                  {stats.recentTrend === 'down' && (
                    <>
                      <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                      <span className="text-sm text-red-600">Declining</span>
                    </>
                  )}
                  {stats.recentTrend === 'stable' && (
                    <span className="text-sm text-muted-foreground">Stable</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}