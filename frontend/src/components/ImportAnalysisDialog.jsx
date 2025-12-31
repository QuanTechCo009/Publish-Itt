import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { importAnalysisApi, chapterApi } from "@/lib/api";
import { toast } from "sonner";
import { 
  Loader2, 
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Wand2,
  Trash2,
  Archive,
  FileStack,
  Compass,
  ClipboardCheck,
  BookOpen,
  Users,
  BookMarked,
  X,
  Check,
  XCircle,
  ArrowLeft
} from "lucide-react";

const ACTION_OPTIONS = [
  {
    id: "autoformat",
    label: "A) Autoformat the manuscript",
    description: "Normalize spacing, fix paragraphs, standardize headings",
    icon: Wand2
  },
  {
    id: "remove_notes",
    label: "B) Remove all notes",
    description: "Remove inline notes, comments, and annotations",
    icon: Trash2
  },
  {
    id: "store_notes",
    label: "C) Store notes separately",
    description: "Extract notes to a separate Notes Collection",
    icon: Archive
  },
  {
    id: "convert_notes",
    label: "D) Convert notes into chapter metadata",
    description: "Transform notes into chapter_notes, revision_notes, author_intent",
    icon: FileStack
  },
  {
    id: "split_chapters",
    label: "E) Split into chapters automatically",
    description: "Detect chapter breaks and create separate Chapter records",
    icon: BookOpen
  },
  {
    id: "lantern_path",
    label: "F) Apply Lantern Path structure",
    description: "Map each chapter to Spark, Exploration, Lantern Moment, Application, Resolution",
    icon: Compass
  },
  {
    id: "full_qa",
    label: "G) Run full QA",
    description: "Check tone, lore, character, pacing, and get a readiness score",
    icon: ClipboardCheck
  },
  {
    id: "extract_summaries",
    label: "H) Extract chapter summaries",
    description: "Generate 2-3 sentence summary for each chapter",
    icon: FileText
  },
  {
    id: "extract_characters",
    label: "I) Extract character list",
    description: "Extract all character names, roles, and descriptions",
    icon: Users
  },
  {
    id: "extract_glossary",
    label: "J) Extract glossary terms",
    description: "Extract unique terms, locations, symbols, and concepts",
    icon: BookMarked
  }
];

export default function ImportAnalysisDialog({ 
  open, 
  onOpenChange, 
  content,
  filename,
  projectId,
  chapterId,
  onActionComplete 
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [executingAction, setExecutingAction] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [implementing, setImplementing] = useState(false);

  const handleAnalyze = async () => {
    if (!content) return;
    
    setAnalyzing(true);
    setAnalysis(null);
    
    try {
      const res = await importAnalysisApi.analyze(content, filename, projectId, chapterId);
      setAnalysis(res.data);
    } catch (error) {
      toast.error("Failed to analyze manuscript");
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecuteAction = async (actionId) => {
    setExecutingAction(actionId);
    setActionResult(null);
    
    try {
      const res = await importAnalysisApi.executeAction(actionId, content, projectId, chapterId);
      setActionResult({ action: actionId, response: res.data.response });
    } catch (error) {
      toast.error("Failed to execute action");
      console.error(error);
    } finally {
      setExecutingAction(null);
    }
  };

  const handleImplement = async () => {
    if (!actionResult) return;
    
    setImplementing(true);
    
    try {
      // Handle implementation based on action type
      const actionId = actionResult.action;
      
      if (actionId === "autoformat" && chapterId) {
        // For autoformat, we could update the chapter content
        // Extract the formatted content from the response if it contains it
        toast.success("Changes noted! You can copy the formatted content from the results.");
      } else if (actionId === "remove_notes" && chapterId) {
        toast.success("Notes removal suggestions saved. Review and apply manually.");
      } else if (actionId === "split_chapters") {
        toast.success("Chapter split suggestions saved. You can create chapters from the Manuscript workspace.");
      } else if (actionId === "full_qa") {
        toast.success("QA report saved for reference.");
      } else if (actionId === "extract_summaries" || actionId === "extract_characters" || actionId === "extract_glossary") {
        toast.success("Extracted data saved for reference.");
      } else {
        toast.success("Changes implemented successfully!");
      }
      
      // Call the onActionComplete callback with implementation flag
      if (onActionComplete) {
        onActionComplete(actionId, actionResult.response, true);
      }
      
      // Go back to actions list
      setActionResult(null);
      
    } catch (error) {
      toast.error("Failed to implement changes");
      console.error(error);
    } finally {
      setImplementing(false);
    }
  };

  const handleIgnore = () => {
    toast.info("Changes ignored");
    
    // Call the onActionComplete callback with ignore flag
    if (onActionComplete) {
      onActionComplete(actionResult?.action, actionResult?.response, false);
    }
    
    // Go back to actions list
    setActionResult(null);
  };

  const handleClose = () => {
    setAnalysis(null);
    setActionResult(null);
    onOpenChange(false);
  };

  // Auto-analyze when dialog opens with content
  useState(() => {
    if (open && content && !analysis && !analyzing) {
      handleAnalyze();
    }
  }, [open, content]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]" data-testid="import-analysis-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-accent" />
            Import Analysis
          </DialogTitle>
          <DialogDescription>
            Thad has analyzed your imported manuscript and prepared recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[600px]">
          {/* Analysis Panel */}
          <div className="flex-1 flex flex-col">
            {!analysis && !analyzing && (
              <div className="flex-1 flex flex-col items-center justify-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Ready to analyze your manuscript</p>
                <Button onClick={handleAnalyze} className="rounded-sm" data-testid="start-analysis-btn">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Manuscript
                </Button>
              </div>
            )}

            {analyzing && (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
                <p className="text-muted-foreground">Analyzing your manuscript...</p>
                <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
              </div>
            )}

            {analysis && !actionResult && (
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  {/* Quick Stats */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-sm">
                      {analysis.word_count.toLocaleString()} words
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      {analysis.estimated_reading_level}
                    </Badge>
                    {analysis.notes_detected?.length > 0 && (
                      <Badge variant="secondary" className="text-sm">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {analysis.notes_detected.length} notes found
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Analysis Content */}
                  <div className="ai-response prose prose-sm max-w-none whitespace-pre-wrap" data-testid="analysis-content">
                    {analysis.analysis}
                  </div>

                  {/* Notes Detected */}
                  {analysis.notes_detected?.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-sm">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        Notes Detected
                      </h4>
                      <ul className="text-sm space-y-1">
                        {analysis.notes_detected.slice(0, 5).map((note, i) => (
                          <li key={i} className="text-muted-foreground font-mono text-xs">
                            {note}
                          </li>
                        ))}
                        {analysis.notes_detected.length > 5 && (
                          <li className="text-muted-foreground text-xs">
                            ...and {analysis.notes_detected.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {actionResult && (
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  {/* Action Header */}
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium">
                      {ACTION_OPTIONS.find(a => a.id === actionResult.action)?.label || actionResult.action}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  {/* Action Result Content */}
                  <div className="ai-response prose prose-sm max-w-none whitespace-pre-wrap" data-testid="action-result">
                    {actionResult.response}
                  </div>
                  
                  <Separator />
                  
                  {/* Implement or Ignore Options */}
                  <div className="sticky bottom-0 bg-background pt-2 pb-1">
                    <p className="text-sm text-muted-foreground mb-3">
                      Would you like to implement these changes or ignore them?
                    </p>
                    <div className="flex items-center gap-3">
                      <Button 
                        onClick={handleImplement}
                        disabled={implementing}
                        className="flex-1 rounded-sm bg-green-600 hover:bg-green-700"
                        data-testid="implement-action-btn"
                      >
                        {implementing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Implement Changes
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleIgnore}
                        disabled={implementing}
                        className="flex-1 rounded-sm"
                        data-testid="ignore-action-btn"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Ignore
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => setActionResult(null)}
                      className="w-full mt-2 rounded-sm text-muted-foreground"
                      disabled={implementing}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Actions
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Actions Panel */}
          {analysis && !actionResult && (
            <div className="w-80 border-l border-border pl-4">
              <h3 className="font-medium text-sm mb-3">Recommended Actions</h3>
              <ScrollArea className="h-[540px]">
                <div className="space-y-2 pr-2">
                  {ACTION_OPTIONS.map((action) => {
                    const isRecommended = analysis.recommended_actions?.includes(action.id);
                    const isExecuting = executingAction === action.id;
                    
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleExecuteAction(action.id)}
                        disabled={executingAction !== null}
                        className={`w-full text-left p-3 rounded-sm border transition-colors ${
                          isRecommended 
                            ? "border-accent bg-accent/5 hover:bg-accent/10" 
                            : "border-border hover:bg-muted"
                        } ${executingAction ? "opacity-50" : ""}`}
                        data-testid={`action-${action.id}`}
                      >
                        <div className="flex items-start gap-2">
                          {isExecuting ? (
                            <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-accent" />
                          ) : (
                            <action.icon className={`h-4 w-4 mt-0.5 ${isRecommended ? "text-accent" : "text-muted-foreground"}`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isRecommended ? "text-accent" : ""}`}>
                              {action.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {action.description}
                            </p>
                            {isRecommended && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                Recommended
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  
                  {/* Do Nothing Option */}
                  <button
                    onClick={handleClose}
                    className="w-full text-left p-3 rounded-sm border border-border hover:bg-muted"
                    data-testid="action-nothing"
                  >
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">K) Do nothing for now</p>
                        <p className="text-xs text-muted-foreground">Close and continue editing</p>
                      </div>
                    </div>
                  </button>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
