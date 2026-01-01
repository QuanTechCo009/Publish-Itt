import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { statsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { 
  Flame, 
  Clock, 
  FileText, 
  TrendingUp,
  Calendar,
  Target,
  Loader2,
  BarChart3,
  Zap
} from "lucide-react";

export default function WritingStatsPanel({ className }) {
  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyGoal] = useState(500); // Default daily goal

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [overviewRes, weeklyRes] = await Promise.all([
        statsApi.getOverview(),
        statsApi.getWeekly()
      ]);
      setStats(overviewRes.data);
      setWeeklyData(weeklyRes.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTodayWords = () => {
    if (!weeklyData.length) return 0;
    const today = weeklyData[weeklyData.length - 1];
    return today?.words || 0;
  };

  const getMaxWeeklyWords = () => {
    if (!weeklyData.length) return dailyGoal;
    return Math.max(...weeklyData.map(d => d.words), dailyGoal);
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-32", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const todayWords = getTodayWords();
  const dailyProgress = Math.min((todayWords / dailyGoal) * 100, 100);
  const maxWords = getMaxWeeklyWords();

  return (
    <div className={cn("space-y-4", className)} data-testid="writing-stats-panel">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Current Streak */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-sm bg-orange-500/20">
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.current_streak || 0}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Words */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-sm bg-blue-500/20">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayWords.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Words Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Goal Progress */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Daily Goal</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {todayWords} / {dailyGoal} words
            </span>
          </div>
          <Progress value={dailyProgress} className="h-2" />
          {dailyProgress >= 100 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <Zap className="h-3 w-3" />
              Goal achieved! 🎉
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Chart */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex items-end justify-between gap-1 h-20">
            {weeklyData.map((day, index) => {
              const height = maxWords > 0 ? (day.words / maxWords) * 100 : 0;
              const isToday = index === weeklyData.length - 1;
              
              return (
                <div 
                  key={day.date} 
                  className="flex-1 flex flex-col items-center gap-1"
                  data-testid={`weekly-bar-${day.day}`}
                >
                  <div className="w-full flex flex-col items-center justify-end h-16">
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-all",
                        isToday 
                          ? "bg-accent" 
                          : day.words > 0 
                            ? "bg-accent/40" 
                            : "bg-muted"
                      )}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px]",
                    isToday ? "font-bold text-accent" : "text-muted-foreground"
                  )}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2 p-2 rounded-sm bg-muted/50">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="font-medium">{formatTime(stats?.total_time_seconds || 0)}</p>
            <p className="text-muted-foreground">Total Time</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-sm bg-muted/50">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="font-medium">{Math.round(stats?.average_words_per_day || 0)}</p>
            <p className="text-muted-foreground">Avg/Day</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-sm bg-muted/50">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="font-medium">{(stats?.total_words_written || 0).toLocaleString()}</p>
            <p className="text-muted-foreground">Total Words</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-sm bg-muted/50">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="font-medium">{stats?.days_active || 0}</p>
            <p className="text-muted-foreground">Days Active</p>
          </div>
        </div>
      </div>

      {/* Longest Streak Badge */}
      {stats?.longest_streak > 0 && (
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="text-xs gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            Best Streak: {stats.longest_streak} days
          </Badge>
        </div>
      )}
    </div>
  );
}
