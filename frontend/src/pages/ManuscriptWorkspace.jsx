import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { projectApi, chapterApi, aiApi, uploadApi, versionsApi, statsApi } from "@/lib/api";
import { cn, formatWordCount } from "@/lib/utils";
import { toast } from "sonner";
import ImportAnalysisDialog from "@/components/ImportAnalysisDialog";
import VersionsPanel from "@/components/VersionsPanel";
import NotesPanel from "@/components/NotesPanel";
import WritingStatsPanel from "@/components/WritingStatsPanel";
import AnalyzerPanel from "@/components/AnalyzerPanel";
import { 
  Plus, 
  Save,
  Wand2,
  FileText,
  ListOrdered,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  List,
  ListOrderedIcon,
  Quote,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Trash2,
  Copy,
  Pencil,
  Upload,
  FileUp,
  X,
  BookX,
  Sparkles,
  History,
  StickyNote,
  BookOpen,
  Clock,
  GitBranch,
  BarChart3,
  Zap
} from "lucide-react";

// Auto-save interval in milliseconds (10 minutes)
const AUTO_VERSION_INTERVAL = 10 * 60 * 1000;

export default function ManuscriptWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  
  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  
  // Dialog state
  const [newChapterOpen, setNewChapterOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlineCount, setOutlineCount] = useState(10);
  const [renameChapterOpen, setRenameChapterOpen] = useState(false);
  const [renameChapterTitle, setRenameChapterTitle] = useState("");
  const [deleteManuscriptOpen, setDeleteManuscriptOpen] = useState(false);
  const [deleteChapterOpen, setDeleteChapterOpen] = useState(false);
  
  // Upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadChapterTitle, setUploadChapterTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Import Analysis state
  const [importAnalysisOpen, setImportAnalysisOpen] = useState(false);
  const [importedContent, setImportedContent] = useState("");
  const [importedFilename, setImportedFilename] = useState("");
  
  // Auto-version state
  const [autoVersionEnabled, setAutoVersionEnabled] = useState(true);
  const [lastVersionTime, setLastVersionTime] = useState(null);
  const [editingStartTime, setEditingStartTime] = useState(null);
  const [autoVersionSaving, setAutoVersionSaving] = useState(false);
  const lastContentRef = useRef("");
  const versionsPanelRef = useRef(null);
  
  // Writing stats tracking state
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionWordCount, setSessionWordCount] = useState(0);
  const [showStatsPanel, setShowStatsPanel] = useState(true);
  const lastWordCountRef = useRef(0);
  const statsIntervalRef = useRef(null);

  // Editor setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing your chapter...",
      }),
      CharacterCount,
    ],
    content: "",
    onUpdate: ({ editor }) => {
      // Auto-save after 2 seconds of inactivity
      if (selectedChapter) {
        debouncedSave(editor.getHTML());
      }
    },
  });

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (content) => {
      if (!selectedChapter) return;
      setSaving(true);
      try {
        await chapterApi.update(selectedChapter.id, { content });
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setSaving(false);
      }
    }, 2000),
    [selectedChapter]
  );

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        loadChapters(projectId);
      }
    }
  }, [projectId, projects]);

  useEffect(() => {
    if (selectedChapter && editor) {
      editor.commands.setContent(selectedChapter.content || "");
      // Reset auto-version tracking when chapter changes
      lastContentRef.current = selectedChapter.content || "";
      setEditingStartTime(null);
      setLastVersionTime(null);
    }
  }, [selectedChapter, editor]);

  // Auto-version logic: Save a version snapshot after 10 minutes of editing
  useEffect(() => {
    if (!autoVersionEnabled || !selectedChapter || !editor) return;

    const checkAndSaveVersion = async () => {
      const currentContent = editor.getHTML();
      const hasContentChanged = currentContent !== lastContentRef.current;
      
      if (!hasContentChanged) {
        // No changes, reset editing timer
        setEditingStartTime(null);
        return;
      }

      // Start tracking editing time if not already
      if (!editingStartTime) {
        setEditingStartTime(Date.now());
        return;
      }

      // Check if 10 minutes have passed since editing started
      const timeSinceEditStart = Date.now() - editingStartTime;
      if (timeSinceEditStart >= AUTO_VERSION_INTERVAL) {
        // Also check if we haven't saved a version recently
        if (lastVersionTime && (Date.now() - lastVersionTime) < AUTO_VERSION_INTERVAL) {
          return;
        }

        // Save auto-version
        setAutoVersionSaving(true);
        try {
          const timestamp = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          await versionsApi.create({
            parent_type: "chapter",
            parent_id: selectedChapter.id,
            content_snapshot: currentContent,
            label: `Auto-save (${timestamp})`,
            created_by: "auto"
          });
          
          // Update tracking
          lastContentRef.current = currentContent;
          setLastVersionTime(Date.now());
          setEditingStartTime(null);
          
          toast.success("Auto-saved version snapshot", {
            description: "Your work has been preserved",
            icon: <GitBranch className="h-4 w-4" />,
          });
        } catch (error) {
          console.error("Auto-version save failed:", error);
        } finally {
          setAutoVersionSaving(false);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkAndSaveVersion, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [autoVersionEnabled, selectedChapter, editor, editingStartTime, lastVersionTime]);

  // Track content changes to detect editing
  useEffect(() => {
    if (!editor || !selectedChapter || !autoVersionEnabled) return;

    const handleUpdate = () => {
      const currentContent = editor.getHTML();
      if (currentContent !== lastContentRef.current && !editingStartTime) {
        setEditingStartTime(Date.now());
      }
    };

    editor.on('update', handleUpdate);
    return () => editor.off('update', handleUpdate);
  }, [editor, selectedChapter, autoVersionEnabled, editingStartTime]);

  // Writing stats tracking - log sessions every 5 minutes
  useEffect(() => {
    if (!editor || !selectedChapter) return;

    const logWritingSession = async () => {
      const currentWordCount = editor.storage.characterCount?.words() || 0;
      const wordDiff = currentWordCount - lastWordCountRef.current;
      
      // Only log if there's been writing activity
      if (wordDiff === 0 && !sessionStartTime) return;
      
      const timeSpent = sessionStartTime 
        ? Math.floor((Date.now() - sessionStartTime) / 1000)
        : 0;
      
      // Only log if significant activity (at least 10 words or 60 seconds)
      if (Math.abs(wordDiff) >= 10 || timeSpent >= 60) {
        try {
          const today = new Date().toISOString().split('T')[0];
          await statsApi.logSession({
            project_id: selectedProject?.id,
            chapter_id: selectedChapter?.id,
            date: today,
            words_added: Math.max(0, wordDiff),
            words_deleted: Math.max(0, -wordDiff),
            time_spent_seconds: timeSpent
          });
          
          // Reset session tracking
          lastWordCountRef.current = currentWordCount;
          setSessionStartTime(null);
          setSessionWordCount(0);
        } catch (error) {
          console.error("Failed to log writing session:", error);
        }
      }
    };

    // Track when editing starts
    const handleEditorUpdate = () => {
      if (!sessionStartTime) {
        setSessionStartTime(Date.now());
        lastWordCountRef.current = editor.storage.characterCount?.words() || 0;
      }
      setSessionWordCount(editor.storage.characterCount?.words() || 0);
    };

    editor.on('update', handleEditorUpdate);
    
    // Log session every 5 minutes
    statsIntervalRef.current = setInterval(logWritingSession, 5 * 60 * 1000);
    
    // Also log on unmount/chapter change
    return () => {
      editor.off('update', handleEditorUpdate);
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      // Log final session
      logWritingSession();
    };
  }, [editor, selectedChapter, selectedProject, sessionStartTime]);

  const loadProjects = async () => {
    try {
      const res = await projectApi.getAll();
      setProjects(res.data);
      if (!projectId && res.data.length > 0) {
        setSelectedProject(res.data[0]);
        loadChapters(res.data[0].id);
      }
    } catch (error) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (projId) => {
    try {
      const res = await chapterApi.getByProject(projId);
      setChapters(res.data);
      if (res.data.length > 0) {
        setSelectedChapter(res.data[0]);
      } else {
        setSelectedChapter(null);
      }
    } catch (error) {
      toast.error("Failed to load chapters");
    }
  };

  const handleProjectChange = (projId) => {
    const project = projects.find(p => p.id === projId);
    setSelectedProject(project);
    navigate(`/manuscript/${projId}`);
    loadChapters(projId);
  };

  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim() || !selectedProject) return;
    
    try {
      const res = await chapterApi.create({
        project_id: selectedProject.id,
        chapter_number: chapters.length + 1,
        title: newChapterTitle,
        content: "",
        status: "draft"
      });
      setChapters([...chapters, res.data]);
      setSelectedChapter(res.data);
      setNewChapterOpen(false);
      setNewChapterTitle("");
      toast.success("Chapter created!");
    } catch (error) {
      toast.error("Failed to create chapter");
    }
  };

  const handleSaveChapter = async () => {
    if (!selectedChapter || !editor) return;
    setSaving(true);
    try {
      await chapterApi.update(selectedChapter.id, { 
        content: editor.getHTML() 
      });
      toast.success("Chapter saved!");
    } catch (error) {
      toast.error("Failed to save chapter");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChapter = async () => {
    if (!selectedChapter) return;
    
    try {
      await chapterApi.delete(selectedChapter.id);
      const newChapters = chapters.filter(c => c.id !== selectedChapter.id);
      setChapters(newChapters);
      setSelectedChapter(newChapters.length > 0 ? newChapters[0] : null);
      setDeleteChapterOpen(false);
      toast.success("Chapter deleted");
    } catch (error) {
      toast.error("Failed to delete chapter");
    }
  };

  const handleDuplicateChapter = async () => {
    if (!selectedChapter || !selectedProject) return;
    
    try {
      const res = await chapterApi.create({
        project_id: selectedProject.id,
        chapter_number: chapters.length + 1,
        title: `${selectedChapter.title} (Copy)`,
        content: selectedChapter.content,
        status: "draft"
      });
      setChapters([...chapters, res.data]);
      setSelectedChapter(res.data);
      toast.success("Chapter duplicated!");
    } catch (error) {
      toast.error("Failed to duplicate chapter");
    }
  };

  const handleRenameChapter = async () => {
    if (!selectedChapter || !renameChapterTitle.trim()) return;
    
    try {
      await chapterApi.update(selectedChapter.id, { title: renameChapterTitle });
      setChapters(chapters.map(c => 
        c.id === selectedChapter.id ? { ...c, title: renameChapterTitle } : c
      ));
      setSelectedChapter({ ...selectedChapter, title: renameChapterTitle });
      setRenameChapterOpen(false);
      setRenameChapterTitle("");
      toast.success("Chapter renamed!");
    } catch (error) {
      toast.error("Failed to rename chapter");
    }
  };

  // Delete Manuscript (Project) Action
  const handleDeleteManuscript = async () => {
    if (!selectedProject) return;
    
    try {
      await projectApi.delete(selectedProject.id);
      const newProjects = projects.filter(p => p.id !== selectedProject.id);
      setProjects(newProjects);
      setDeleteManuscriptOpen(false);
      
      if (newProjects.length > 0) {
        setSelectedProject(newProjects[0]);
        loadChapters(newProjects[0].id);
        navigate(`/manuscript/${newProjects[0].id}`);
      } else {
        setSelectedProject(null);
        setChapters([]);
        setSelectedChapter(null);
        navigate("/");
      }
      
      toast.success("Manuscript deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete manuscript");
    }
  };

  const openRenameDialog = () => {
    if (selectedChapter) {
      setRenameChapterTitle(selectedChapter.title);
      setRenameChapterOpen(true);
    }
  };

  // AI Functions
  const handleRewriteForTone = async () => {
    if (!editor || !editor.getText().trim()) {
      toast.error("No content to rewrite");
      return;
    }
    setAiLoading(true);
    try {
      const res = await aiApi.rewrite(editor.getText(), "warm and engaging");
      setAiResponse(res.data.response);
    } catch (error) {
      toast.error("Failed to get AI response");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!editor || !editor.getText().trim()) {
      toast.error("No content to summarize");
      return;
    }
    setAiLoading(true);
    try {
      const res = await aiApi.summarize(editor.getText());
      setAiResponse(res.data.response);
    } catch (error) {
      toast.error("Failed to get AI response");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!selectedProject?.summary) {
      toast.error("Please add a summary to your project first");
      return;
    }
    setAiLoading(true);
    setOutlineOpen(false);
    try {
      const res = await aiApi.generateOutline(selectedProject.summary, outlineCount);
      setAiResponse(res.data.response);
    } catch (error) {
      toast.error("Failed to generate outline");
    } finally {
      setAiLoading(false);
    }
  };

  // Upload Functions
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (file) => {
    const allowedTypes = ['.txt', '.docx', '.pdf', '.md'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(ext)) {
      toast.error(`Unsupported file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }
    
    setUploadedFile(file);
    setUploadChapterTitle(file.name.replace(/\.[^/.]+$/, ""));
    setUploading(true);
    
    try {
      const res = await uploadApi.previewManuscript(file);
      setUploadPreview(res.data);
      setUploadDialogOpen(true);
    } catch (error) {
      toast.error("Failed to preview file: " + (error.response?.data?.detail || error.message));
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadConfirm = async () => {
    if (!uploadedFile || !selectedProject) return;
    
    setUploading(true);
    try {
      const res = await uploadApi.uploadManuscript(
        uploadedFile,
        selectedProject.id,
        uploadChapterTitle || uploadedFile.name.replace(/\.[^/.]+$/, "")
      );
      
      if (res.data.chapter_id) {
        await loadChapters(selectedProject.id);
        // Select the new chapter
        const newChapter = await chapterApi.getById(res.data.chapter_id);
        setSelectedChapter(newChapter.data);
        toast.success(`Imported "${uploadChapterTitle}" (${res.data.word_count.toLocaleString()} words)`);
        
        // Trigger Import Analysis
        setImportedContent(uploadPreview?.full_content || res.data.content);
        setImportedFilename(uploadedFile.name);
        handleUploadClose();
        setImportAnalysisOpen(true);
      } else {
        handleUploadClose();
      }
    } catch (error) {
      toast.error("Failed to import manuscript: " + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleImportActionComplete = (actionId, result) => {
    // Handle specific actions if needed
    if (actionId === "autoformat" && selectedChapter && editor) {
      // Could apply the formatted content back to the editor
      toast.success("You can review the formatted content in the results");
    }
  };

  const handleUploadClose = () => {
    setUploadDialogOpen(false);
    setUploadedFile(null);
    setUploadPreview(null);
    setUploadChapterTitle("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="font-serif text-2xl mb-2">No Projects Yet</h2>
        <p className="text-muted-foreground mb-4">Create a project to start writing</p>
        <Button onClick={() => navigate("/")} className="rounded-sm">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden" data-testid="manuscript-workspace">
      {/* ManuscriptPanel - Chapter Sidebar */}
      <aside 
        className={cn(
          "flex flex-col bg-card border-r border-border sidebar-transition overflow-hidden",
          sidebarCollapsed ? "w-12" : "w-72"
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
          {!sidebarCollapsed && (
            <Select
              value={selectedProject?.id}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="flex-1 mr-2 rounded-sm text-sm" data-testid="project-select">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="shrink-0"
            data-testid="toggle-sidebar-btn"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {!sidebarCollapsed && (
          /* ManuscriptPanel Container - All manuscript UI contained here */
          <div 
            className="flex flex-col w-full overflow-hidden flex-1"
            data-testid="manuscript-panel"
          >
            <Tabs defaultValue="chapters" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full grid grid-cols-4 mx-3 mt-3 rounded-sm" data-testid="sidebar-tabs">
                <TabsTrigger value="chapters" className="text-xs rounded-sm" data-testid="chapters-tab">
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  Chapters
                </TabsTrigger>
                <TabsTrigger value="versions" className="text-xs rounded-sm" data-testid="versions-tab">
                  <History className="h-3.5 w-3.5 mr-1" />
                  Versions
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs rounded-sm" data-testid="notes-tab">
                  <StickyNote className="h-3.5 w-3.5 mr-1" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="analyzer" className="text-xs rounded-sm" data-testid="analyzer-tab">
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Analyze
                </TabsTrigger>
              </TabsList>
              
              {/* Chapters Tab */}
              <TabsContent value="chapters" className="flex-1 flex flex-col gap-3 p-4 mt-0 overflow-hidden">
                {/* Scrollable Manuscript/Chapter List */}
                <div 
                  className="overflow-y-auto pr-2 max-h-[400px]"
                  data-testid="chapter-list-container"
                >
                  <div className="space-y-1">
                    {chapters.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No chapters yet
                      </p>
                    ) : (
                      chapters.map((chapter) => (
                        <button
                          key={chapter.id}
                          onClick={() => setSelectedChapter(chapter)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-sm text-sm transition-colors",
                            selectedChapter?.id === chapter.id
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted"
                          )}
                          data-testid={`chapter-${chapter.id}`}
                        >
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {chapter.chapter_number}.
                          </span>
                          {chapter.title}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Manuscript Buttons - All inside ManuscriptPanel, below list */}
                <div className="flex flex-col gap-2 border-t border-border pt-3 w-full">
                  <Button 
                    variant="outline" 
                    className="w-full rounded-sm justify-start" 
                    size="sm"
                    onClick={() => setNewChapterOpen(true)}
                    data-testid="add-chapter-btn"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Chapter
                  </Button>
                  
                  {/* Upload/Import Button */}
                  <Button 
                    variant="outline" 
                    className="w-full rounded-sm justify-start" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedProject || uploading}
                    data-testid="upload-manuscript-btn"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Import Manuscript
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.docx,.pdf,.md"
                    onChange={handleFileInputChange}
                    className="hidden"
                    data-testid="file-input"
                  />
                  
                  <Button 
                    variant="outline" 
                    className="w-full rounded-sm justify-start" 
                    size="sm"
                    onClick={handleDuplicateChapter}
                    disabled={!selectedChapter}
                    data-testid="duplicate-chapter-btn"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Chapter
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full rounded-sm justify-start" 
                    size="sm"
                    onClick={openRenameDialog}
                    disabled={!selectedChapter}
                    data-testid="rename-chapter-btn"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename Chapter
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full rounded-sm justify-start text-destructive hover:text-destructive" 
                    size="sm"
                    onClick={() => setDeleteChapterOpen(true)}
                    disabled={!selectedChapter}
                    data-testid="delete-chapter-btn"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Chapter
                  </Button>
                  
                  {/* Delete Manuscript Button */}
                  <div className="border-t border-border pt-2 mt-1 w-full">
                    <Button 
                      variant="destructive" 
                      className="w-full rounded-sm justify-start" 
                      size="sm"
                      onClick={() => setDeleteManuscriptOpen(true)}
                      disabled={!selectedProject}
                      data-testid="delete-manuscript-btn"
                    >
                      <BookX className="h-4 w-4 mr-2" />
                      Delete Manuscript
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Versions Tab */}
              <TabsContent value="versions" className="flex-1 p-4 mt-0 overflow-auto">
                <VersionsPanel 
                  parentType="chapter"
                  parentId={selectedChapter?.id}
                  currentContent={editor?.getHTML() || ""}
                  onRestoreVersion={(content) => {
                    if (editor) {
                      editor.commands.setContent(content);
                      toast.success("Version restored");
                    }
                  }}
                />
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="flex-1 p-4 mt-0 overflow-auto">
                <NotesPanel 
                  parentType="chapter"
                  parentId={selectedChapter?.id}
                />
              </TabsContent>

              {/* Analyzer Tab */}
              <TabsContent value="analyzer" className="flex-1 p-4 mt-0 overflow-auto">
                <AnalyzerPanel 
                  content={editor?.getText() || ""}
                  chapterId={selectedChapter?.id}
                  projectId={selectedProject?.id}
                  onApplyChange={(newContent) => {
                    if (editor) {
                      editor.commands.setContent(newContent);
                      toast.success("Change applied to editor");
                    }
                  }}
                  onCreateVersion={async (label) => {
                    if (selectedChapter && editor) {
                      try {
                        await versionsApi.create({
                          parent_type: "chapter",
                          parent_id: selectedChapter.id,
                          content_snapshot: editor.getHTML(),
                          label: label,
                          created_by: "thaddaeus"
                        });
                      } catch (e) {
                        console.error("Failed to create version:", e);
                      }
                    }
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </aside>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-1">
            <ToolbarButton 
              icon={Bold} 
              active={editor?.isActive('bold')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarButton 
              icon={Italic} 
              active={editor?.isActive('italic')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton 
              icon={Heading1} 
              active={editor?.isActive('heading', { level: 1 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolbarButton 
              icon={Heading2} 
              active={editor?.isActive('heading', { level: 2 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton 
              icon={List} 
              active={editor?.isActive('bulletList')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton 
              icon={ListOrderedIcon} 
              active={editor?.isActive('orderedList')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
            <ToolbarButton 
              icon={Quote} 
              active={editor?.isActive('blockquote')}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
            <div className="w-px h-6 bg-border mx-2" />
            <ToolbarButton 
              icon={Undo} 
              onClick={() => editor?.chain().focus().undo().run()}
            />
            <ToolbarButton 
              icon={Redo} 
              onClick={() => editor?.chain().focus().redo().run()}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Auto-version indicator */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-sm bg-muted/50" data-testid="auto-version-indicator">
              <div className="flex items-center gap-1.5">
                {autoVersionSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                ) : (
                  <Clock className={cn(
                    "h-3.5 w-3.5",
                    autoVersionEnabled ? "text-accent" : "text-muted-foreground"
                  )} />
                )}
                <span className="text-xs text-muted-foreground">
                  {autoVersionSaving ? "Saving version..." : "Auto-version"}
                </span>
              </div>
              <Switch
                checked={autoVersionEnabled}
                onCheckedChange={setAutoVersionEnabled}
                className="scale-75"
                data-testid="auto-version-toggle"
              />
            </div>
            
            <div className="w-px h-6 bg-border" />
            
            {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
            <span className="text-xs text-muted-foreground font-mono">
              {editor?.storage.characterCount?.words() || 0} words
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveChapter}
              disabled={saving || !selectedChapter}
              className="rounded-sm"
              data-testid="save-chapter-btn"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className="flex-1 overflow-auto p-8">
            {selectedChapter ? (
              <div className="max-w-3xl mx-auto">
                <Input
                  value={selectedChapter.title}
                  onChange={async (e) => {
                    const newTitle = e.target.value;
                    setSelectedChapter({ ...selectedChapter, title: newTitle });
                    await chapterApi.update(selectedChapter.id, { title: newTitle });
                  }}
                  className="text-3xl font-serif font-medium border-none p-0 h-auto mb-6 focus-visible:ring-0"
                  placeholder="Chapter Title"
                  data-testid="chapter-title-input"
                />
                <EditorContent 
                  editor={editor} 
                  className="prose prose-lg max-w-none"
                  data-testid="chapter-editor"
                />
              </div>
            ) : (
              /* Empty state with drag-and-drop zone */
              <div 
                className={cn(
                  "flex flex-col items-center justify-center h-full transition-colors",
                  isDragging 
                    ? "bg-accent/10 border-2 border-dashed border-accent" 
                    : "text-muted-foreground"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-testid="drop-zone"
              >
                {isDragging ? (
                  <>
                    <FileUp className="h-16 w-16 mb-4 text-accent animate-bounce" />
                    <p className="text-lg font-medium text-accent">Drop your manuscript here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supported: .txt, .docx, .pdf, .md
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="h-12 w-12 mb-4" />
                    <p className="mb-4">Select or create a chapter to start writing</p>
                    <div className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-lg">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Drag & drop a manuscript file here</p>
                      <p className="text-xs text-muted-foreground">or</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-sm"
                        data-testid="browse-files-btn"
                      >
                        Browse Files
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Supports .txt, .docx, .pdf, .md
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* AI Panel */}
          <aside
            className={cn(
              "flex flex-col bg-card border-l border-border sidebar-transition overflow-hidden",
              aiPanelCollapsed ? "w-12" : "w-80"
            )}
          >
            {aiPanelCollapsed ? (
              /* Collapsed state */
              <div className="flex items-center justify-center p-3 border-b border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAiPanelCollapsed(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              /* Expanded state with Tabs */
              <Tabs defaultValue="ai" className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-border gap-2 shrink-0">
                  <TabsList className="grid grid-cols-2 h-8 flex-1">
                    <TabsTrigger value="ai" className="text-xs" data-testid="ai-tab">
                      <Wand2 className="h-3 w-3 mr-1" />
                      AI
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="text-xs" data-testid="stats-tab">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Stats
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAiPanelCollapsed(true)}
                    className="shrink-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* AI Tab Content */}
                <TabsContent value="ai" className="flex-1 flex flex-col mt-0 overflow-hidden">
                  <div className="p-3 space-y-2 border-b border-border shrink-0">
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-sm"
                      size="sm"
                      onClick={handleRewriteForTone}
                      disabled={aiLoading}
                      data-testid="rewrite-tone-btn"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Rewrite for Tone
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-sm"
                      size="sm"
                      onClick={handleSummarize}
                      disabled={aiLoading}
                      data-testid="summarize-btn"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Summarize Chapter
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-sm"
                      size="sm"
                      onClick={() => setOutlineOpen(true)}
                      disabled={aiLoading}
                      data-testid="generate-outline-btn"
                    >
                      <ListOrdered className="h-4 w-4 mr-2" />
                      Generate Book Outline
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-sm bg-accent/10 hover:bg-accent/20 text-accent"
                      size="sm"
                      onClick={() => {
                        if (editor && selectedChapter) {
                          setImportedContent(editor.getText());
                          setImportedFilename(selectedChapter.title);
                          setImportAnalysisOpen(true);
                        }
                      }}
                      disabled={!selectedChapter || !editor?.getText()}
                      data-testid="analyze-chapter-btn"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze Chapter
                    </Button>
                  </div>

                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3">
                      {aiLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-accent" />
                        </div>
                      ) : aiResponse ? (
                        <div className="ai-response text-sm whitespace-pre-wrap" data-testid="ai-response">
                          {aiResponse}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          AI suggestions will appear here
                        </p>
                      )}
                    </div>
                  </ScrollArea>
              </TabsContent>

              {/* Stats Tab Content */}
              <TabsContent value="stats" className="flex-1 mt-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3">
                    <WritingStatsPanel />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
            )}
          </aside>
        </div>
      </div>

      {/* New Chapter Dialog */}
      <Dialog open={newChapterOpen} onOpenChange={setNewChapterOpen}>
        <DialogContent data-testid="new-chapter-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif">Add New Chapter</DialogTitle>
            <DialogDescription>
              Create a new chapter for your manuscript.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="chapterTitle">Chapter Title</Label>
            <Input
              id="chapterTitle"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              placeholder="Enter chapter title"
              className="mt-2 rounded-sm"
              data-testid="new-chapter-title-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChapterOpen(false)} className="rounded-sm">
              Cancel
            </Button>
            <Button onClick={handleCreateChapter} className="rounded-sm" data-testid="create-chapter-submit">
              Create Chapter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Chapter Dialog */}
      <Dialog open={renameChapterOpen} onOpenChange={setRenameChapterOpen}>
        <DialogContent data-testid="rename-chapter-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif">Rename Chapter</DialogTitle>
            <DialogDescription>
              Enter a new name for this chapter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="renameChapterTitle">Chapter Title</Label>
            <Input
              id="renameChapterTitle"
              value={renameChapterTitle}
              onChange={(e) => setRenameChapterTitle(e.target.value)}
              placeholder="Enter new chapter title"
              className="mt-2 rounded-sm"
              data-testid="rename-chapter-title-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameChapterOpen(false)} className="rounded-sm">
              Cancel
            </Button>
            <Button onClick={handleRenameChapter} className="rounded-sm" data-testid="rename-chapter-submit">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outline Dialog */}
      <Dialog open={outlineOpen} onOpenChange={setOutlineOpen}>
        <DialogContent data-testid="outline-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif">Generate Book Outline</DialogTitle>
            <DialogDescription>
              AI will generate a chapter-by-chapter outline based on your project summary.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="chapterCount">Number of Chapters</Label>
            <Input
              id="chapterCount"
              type="number"
              min={3}
              max={50}
              value={outlineCount}
              onChange={(e) => setOutlineCount(parseInt(e.target.value) || 10)}
              className="mt-2 rounded-sm"
              data-testid="outline-chapter-count"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutlineOpen(false)} className="rounded-sm">
              Cancel
            </Button>
            <Button onClick={handleGenerateOutline} className="rounded-sm" data-testid="generate-outline-submit">
              Generate Outline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chapter Confirmation Dialog */}
      <AlertDialog open={deleteChapterOpen} onOpenChange={setDeleteChapterOpen}>
        <AlertDialogContent data-testid="delete-chapter-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this chapter?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The chapter "{selectedChapter?.title}" will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteChapter} 
              className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-chapter-btn"
            >
              Delete Chapter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Manuscript Confirmation Dialog */}
      <AlertDialog open={deleteManuscriptOpen} onOpenChange={setDeleteManuscriptOpen}>
        <AlertDialogContent data-testid="delete-manuscript-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this manuscript?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The manuscript "{selectedProject?.title}" and all its chapters will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteManuscript} 
              className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-manuscript-btn"
            >
              Delete Manuscript
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload/Import Manuscript Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={handleUploadClose}>
        <DialogContent className="sm:max-w-2xl" data-testid="upload-manuscript-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Import Manuscript
            </DialogTitle>
            <DialogDescription>
              Preview and import your external manuscript as a new chapter.
            </DialogDescription>
          </DialogHeader>
          
          {uploadPreview && (
            <div className="space-y-4 py-4">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-sm">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{uploadPreview.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {uploadPreview.file_type.toUpperCase()} • {uploadPreview.word_count.toLocaleString()} words
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUploadClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Chapter Title Input */}
              <div className="space-y-2">
                <Label htmlFor="uploadChapterTitle">Chapter Title</Label>
                <Input
                  id="uploadChapterTitle"
                  value={uploadChapterTitle}
                  onChange={(e) => setUploadChapterTitle(e.target.value)}
                  placeholder="Enter chapter title"
                  className="rounded-sm"
                  data-testid="upload-chapter-title-input"
                />
              </div>
              
              {/* Preview */}
              <div className="space-y-2">
                <Label>Content Preview</Label>
                <ScrollArea className="h-[200px] border border-border rounded-sm p-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {uploadPreview.preview}
                  </p>
                </ScrollArea>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleUploadClose}
              className="rounded-sm"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUploadConfirm}
              disabled={uploading || !uploadChapterTitle.trim()}
              className="rounded-sm"
              data-testid="confirm-upload-btn"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import as Chapter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Analysis Dialog */}
      <ImportAnalysisDialog
        open={importAnalysisOpen}
        onOpenChange={setImportAnalysisOpen}
        content={importedContent}
        filename={importedFilename}
        projectId={selectedProject?.id}
        chapterId={selectedChapter?.id}
        onActionComplete={handleImportActionComplete}
      />
    </div>
  );
}

// Toolbar Button Component
function ToolbarButton({ icon: Icon, active, onClick }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-sm",
        active && "bg-muted"
      )}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
