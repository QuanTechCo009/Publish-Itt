import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
  Zap,
  Sparkles,
  RefreshCw,
  ArrowRight
} from "lucide-react";

export default function WritingStatsPanel({ className, ageGroup, autoAnalyzeOnMount = true }) {
  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyGoal] = useState(500); // Default daily goal
  
  // Momentum state
  const [momentumData, setMomentumData] = useState(null);
  const [momentumLoading, setMomentumLoading] = useState(false);
  const [lastMomentumCheck, setLastMomentumCheck] = useState(null);

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

  // Get momentum analysis from Thad
  const loadMomentum = useCallback(async () => {
    if (!stats) return;
    
    setMomentumLoading(true);
    try {
      const todayWords = getTodayWords();
      const weeklyWords = weeklyData.reduce((sum, d) => sum + (d.words || 0), 0);
      const totalTime = stats?.total_time_seconds || 0;
      const sessionMinutes = Math.round(totalTime / 60);
      
      // Calculate time away (simplified)
      const timeAway = stats?.last_writing_date 
        ? `Last wrote on ${stats.last_writing_date}` 
        : "First time writing";
      
      const response = await statsApi.getMomentum(
        todayWords,
        weeklyWords,
        stats?.current_streak || 0,
        stats?.total_words_written || 0,
        sessionMinutes,
        timeAway,
        null, // goals
        ageGroup
      );
      
      setMomentumData(response.data);
      setLastMomentumCheck(Date.now());
    } catch (error) {
      console.error("Failed to load momentum:", error);
      // Set fallback message
      setMomentumData({
        message: "Your writing journey awaits! Every word you write brings your story to life.",
        suggestions: ["Start writing today", "Set a small daily goal"]
      });
    } finally {
      setMomentumLoading(false);
    }
  }, [stats, weeklyData, ageGroup]);

  // Auto-load momentum when stats are available
  useEffect(() => {
    if (autoAnalyzeOnMount && stats && !momentumData && !momentumLoading) {
      loadMomentum();
    }
  }, [autoAnalyzeOnMount, stats, momentumData, momentumLoading, loadMomentum]);

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
      {/* Thad's Momentum Message */}
      <Card className="border-l-4 border-l-accent bg-gradient-to-br from-accent/5 to-transparent" data-testid="momentum-card">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Your Momentum
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMomentum}
              disabled={momentumLoading}
              className="h-7 px-2 text-xs"
              data-testid="refresh-momentum-btn"
            >
              {momentumLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {momentumLoading && !momentumData ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Checking your momentum...</span>
            </div>
          ) : momentumData ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed" data-testid="momentum-message">
                {momentumData.message}
              </p>
              
              {/* Suggestions */}
              {momentumData.suggestions && momentumData.suggestions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {momentumData.suggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                      data-testid={`momentum-suggestion-${index}`}
                    >
                      <ArrowRight className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {lastMomentumCheck && (
                <div className="text-[10px] text-muted-foreground pt-1">
                  Updated: {new Date(lastMomentumCheck).toLocaleTimeString()}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click refresh to see your writing momentum!
            </p>
          )}
        </CardContent>
      </Card>

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
                <p className="text-2xl font-bold" data-testid="streak-count">{stats?.current_streak || 0}</p>
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
                <p className="text-2xl font-bold" data-testid="today-words">{todayWords.toLocaleString()}</p>
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
          <Progress value={dailyProgress} className="h-2" data-testid="daily-progress" />
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
            <p className="font-medium" data-testid="total-time">{formatTime(stats?.total_time_seconds || 0)}</p>
            <p className="text-muted-foreground">Total Time</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-sm bg-muted/50">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="font-medium" data-testid="avg-words">{Math.round(stats?.average_words_per_day || 0)}</p>
            <p className="text-muted-foreground">Avg/Day</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-sm bg-muted/50">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="font-medium" data-testid="total-words">{(stats?.total_words_written || 0).toLocaleString()}</p>
            <p className="text-muted-foreground">Total Words</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-sm bg-muted/50">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="font-medium" data-testid="days-active">{stats?.days_active || 0}</p>
            <p className="text-muted-foreground">Days Active</p>
          </div>
        </div>
      </div>

      {/* Longest Streak Badge */}
      {stats?.longest_streak > 0 && (
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="text-xs gap-1" data-testid="longest-streak-badge">
            <Flame className="h-3 w-3 text-orange-500" />
            Best Streak: {stats.longest_streak} days
          </Badge>
        </div>
      )}
    </div>
  );
}
