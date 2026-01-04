import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { aiApi, notesApi, versionsApi, importAnalysisApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Check,
  StickyNote,
  X,
  RefreshCw,
  AlertTriangle,
  FileText,
  Zap,
  BookOpen,
  Palette,
  ListChecks
} from "lucide-react";

const CATEGORY_CONFIG = {
  structure: {
    label: "Structure",
    icon: BookOpen,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20"
  },
  formatting: {
    label: "Formatting",
    icon: FileText,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20"
  },
  tone: {
    label: "Tone & Style",
    icon: Palette,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20"
  },
  notes: {
    label: "Notes Detected",
    icon: StickyNote,
    color: "bg-green-500/10 text-green-600 border-green-500/20"
  },
  chapters: {
    label: "Chapter Detection",
    icon: ListChecks,
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
  },
  issues: {
    label: "Issues",
    icon: AlertTriangle,
    color: "bg-red-500/10 text-red-600 border-red-500/20"
  }
};

export default function AnalyzerPanel({ 
  content,
  chapterId,
  projectId,
  onApplyChange,
  onCreateVersion 
}) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set(['structure', 'formatting', 'issues']));

  // Group findings by category
  const groupedFindings = findings.reduce((acc, finding) => {
    if (dismissedIds.has(finding.id)) return acc;
    const category = finding.category || 'issues';
    if (!acc[category]) acc[category] = [];
    acc[category].push(finding);
    return acc;
  }, {});

  const runAnalysis = async () => {
    if (!content || content.trim().length < 50) {
      toast.error("Not enough content to analyze");
      return;
    }

    setAnalyzing(true);
    try {
      const res = await aiApi.importAnalyze({ 
        content, 
        filename: "Chapter Analysis" 
      });
      
      // Transform analysis results into findings
      const analysisFindings = [];
      let findingId = 0;

      // Parse the analysis response
      if (res.data?.analysis) {
        const analysis = res.data.analysis;
        
        // Structure findings
        if (analysis.structure_issues?.length) {
          analysis.structure_issues.forEach(issue => {
            analysisFindings.push({
              id: `finding-${findingId++}`,
              category: 'structure',
              title: issue.title || 'Structure Issue',
              description: issue.description || issue,
              suggestion: issue.suggestion,
              severity: issue.severity || 'medium',
              applyAction: issue.fix
            });
          });
        }

        // Formatting findings
        if (analysis.formatting_issues?.length) {
          analysis.formatting_issues.forEach(issue => {
            analysisFindings.push({
              id: `finding-${findingId++}`,
              category: 'formatting',
              title: issue.title || 'Formatting Issue',
              description: issue.description || issue,
              suggestion: issue.suggestion,
              severity: issue.severity || 'low',
              applyAction: issue.fix
            });
          });
        }

        // Notes detected
        if (analysis.notes_detected?.length) {
          analysis.notes_detected.forEach(note => {
            analysisFindings.push({
              id: `finding-${findingId++}`,
              category: 'notes',
              title: 'Author Note Detected',
              description: note.text || note,
              location: note.location,
              severity: 'info',
              noteText: note.text || note
            });
          });
        }

        // Chapter detection
        if (analysis.chapter_breaks?.length) {
          analysis.chapter_breaks.forEach(chapter => {
            analysisFindings.push({
              id: `finding-${findingId++}`,
              category: 'chapters',
              title: chapter.title || 'Chapter Break Detected',
              description: `Potential chapter starting at: "${chapter.preview || chapter}"`,
              severity: 'info'
            });
          });
        }

        // Tone issues
        if (analysis.tone_issues?.length) {
          analysis.tone_issues.forEach(issue => {
            analysisFindings.push({
              id: `finding-${findingId++}`,
              category: 'tone',
              title: issue.title || 'Tone Inconsistency',
              description: issue.description || issue,
              suggestion: issue.suggestion,
              severity: issue.severity || 'medium'
            });
          });
        }
      }

      // If no structured analysis, create generic findings
      if (analysisFindings.length === 0 && res.data?.suggestions) {
        res.data.suggestions.forEach((suggestion, idx) => {
          analysisFindings.push({
            id: `finding-${idx}`,
            category: 'issues',
            title: suggestion.action || 'Suggestion',
            description: suggestion.description || suggestion,
            severity: 'medium'
          });
        });
      }

      setFindings(analysisFindings);
      setDismissedIds(new Set());
      
      if (analysisFindings.length > 0) {
        toast.success(`Found ${analysisFindings.length} items to review`);
      } else {
        toast.success("Analysis complete - no issues found!");
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Failed to analyze content");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyChange = async (finding) => {
    if (finding.applyAction && onApplyChange) {
      // Create version snapshot first
      if (onCreateVersion) {
        await onCreateVersion(`Before applying: ${finding.title}`);
      }
      onApplyChange(finding.applyAction);
      setDismissedIds(prev => new Set([...prev, finding.id]));
      toast.success("Change applied");
    }
  };

  const handleSaveToNotes = async (finding) => {
    if (!chapterId) {
      toast.error("No chapter selected");
      return;
    }

    try {
      await notesApi.create({
        parent_type: "chapter",
        parent_id: chapterId,
        note_text: finding.noteText || finding.description,
        location_reference: finding.location || "",
        note_type: "comment"
      });
      setDismissedIds(prev => new Set([...prev, finding.id]));
      toast.success("Saved to notes");
    } catch (error) {
      toast.error("Failed to save note");
    }
  };

  const handleDismiss = (findingId) => {
    setDismissedIds(prev => new Set([...prev, findingId]));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const totalFindings = Object.values(groupedFindings).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-4" data-testid="analyzer-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">THADDAEUS Analyzer</span>
          {totalFindings > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalFindings}
            </Badge>
          )}
        </div>
        <Button 
          size="sm" 
          onClick={runAnalysis}
          disabled={analyzing || !content}
          className="rounded-sm h-8"
          data-testid="run-analysis-btn"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Analyze
            </>
          )}
        </Button>
      </div>

      {/* Findings List */}
      {analyzing ? (
        <div className="flex flex-col items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-accent mb-2" />
          <p className="text-sm text-muted-foreground">THADDAEUS is analyzing...</p>
        </div>
      ) : totalFindings === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-1">No findings yet</p>
            <p className="text-xs text-muted-foreground">
              Click "Analyze" to scan your manuscript
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[350px]">
          <div className="space-y-3 pr-2">
            {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => {
              const categoryFindings = groupedFindings[categoryKey];
              if (!categoryFindings?.length) return null;
              
              const CategoryIcon = config.icon;
              const isExpanded = expandedCategories.has(categoryKey);
              
              return (
                <Collapsible 
                  key={categoryKey} 
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(categoryKey)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-sm transition-colors",
                        config.color
                      )}
                      data-testid={`category-${categoryKey}`}
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4" />
                        <span className="font-medium text-sm">{config.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {categoryFindings.length}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-2 pl-2">
                      {categoryFindings.map((finding) => (
                        <Card 
                          key={finding.id} 
                          className="border-l-2 border-l-accent"
                          data-testid={`finding-${finding.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-medium text-sm">{finding.title}</h4>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px] shrink-0",
                                  finding.severity === 'high' && "border-red-500 text-red-600",
                                  finding.severity === 'medium' && "border-amber-500 text-amber-600",
                                  finding.severity === 'low' && "border-blue-500 text-blue-600",
                                  finding.severity === 'info' && "border-gray-400 text-gray-600"
                                )}
                              >
                                {finding.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                              {finding.description}
                            </p>
                            {finding.suggestion && (
                              <p className="text-xs text-accent mb-3 italic">
                                💡 {finding.suggestion}
                              </p>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-1.5">
                              {finding.applyAction && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-xs rounded-sm"
                                  onClick={() => handleApplyChange(finding)}
                                  data-testid={`apply-${finding.id}`}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Apply
                                </Button>
                              )}
                              {(finding.category === 'notes' || finding.noteText) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs rounded-sm"
                                  onClick={() => handleSaveToNotes(finding)}
                                  data-testid={`save-note-${finding.id}`}
                                >
                                  <StickyNote className="h-3 w-3 mr-1" />
                                  Save to Notes
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs rounded-sm"
                                onClick={() => handleDismiss(finding.id)}
                                data-testid={`dismiss-${finding.id}`}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Quick Actions */}
      {totalFindings > 0 && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-sm text-xs"
            onClick={() => setDismissedIds(new Set(findings.map(f => f.id)))}
            data-testid="dismiss-all-btn"
          >
            Dismiss All
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 rounded-sm text-xs"
            onClick={runAnalysis}
            data-testid="reanalyze-btn"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Re-analyze
          </Button>
        </div>
      )}
    </div>
  );
}
