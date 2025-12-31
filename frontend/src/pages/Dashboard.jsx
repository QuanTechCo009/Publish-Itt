import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectApi, uploadApi } from "@/lib/api";
import { cn, statusColors, formatDate, formatWordCount, calculateProgress } from "@/lib/utils";
import { toast } from "sonner";
import ImportAnalysisDialog from "@/components/ImportAnalysisDialog";
import { 
  Plus, 
  FileText, 
  GitBranch, 
  Palette, 
  ImageIcon,
  BookOpen,
  Loader2,
  Upload,
  FileUp,
  X
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    series_name: "",
    universe: "",
    type: "novel",
    summary: ""
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectApi.getAll();
      setProjects(res.data);
    } catch (error) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setCreating(true);
    try {
      const res = await projectApi.create(newProject);
      setProjects([...projects, res.data]);
      setDialogOpen(false);
      setNewProject({ title: "", series_name: "", universe: "", type: "novel", summary: "" });
      toast.success("Project created successfully!");
    } catch (error) {
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const QuickAction = ({ icon: Icon, label, onClick }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded-sm"
    >
      <Icon className="h-3.5 w-3.5 mr-1" />
      {label}
    </Button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight">
            Your Library
          </h1>
          <p className="mt-2 text-muted-foreground">
            {projects.length} {projects.length === 1 ? "project" : "projects"} in progress
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="rounded-sm"
          data-testid="new-project-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Start New Book
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-serif text-xl mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Start your first book to begin your writing journey
            </p>
            <Button onClick={() => setDialogOpen(true)} className="rounded-sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <Card 
              key={project.id} 
              className="card-hover cursor-pointer animate-slide-in overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => navigate(`/manuscript/${project.id}`)}
              data-testid={`project-card-${project.id}`}
            >
              {/* Project Card Content - All children contained within */}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-xl font-medium truncate">
                      {project.title}
                    </h3>
                    {project.series_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {project.series_name}
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`ml-2 shrink-0 capitalize text-xs ${statusColors[project.status] || statusColors.concept}`}
                  >
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Project Info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {project.universe || "No universe"}
                  </span>
                  <span className="font-mono text-xs">
                    {formatWordCount(project.word_count)} words
                  </span>
                </div>
                
                {/* Progress Section */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono">{calculateProgress(project.status)}%</span>
                  </div>
                  <Progress 
                    value={calculateProgress(project.status)} 
                    className="h-1.5"
                  />
                </div>

                {/* Quick Actions Panel - Child of Card, contained within bounds */}
                <div 
                  className="flex flex-wrap items-center gap-1 pt-3 border-t border-border w-full"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`project-actions-${project.id}`}
                >
                  <QuickAction 
                    icon={FileText} 
                    label="Manuscript"
                    onClick={() => navigate(`/manuscript/${project.id}`)}
                  />
                  <QuickAction 
                    icon={GitBranch} 
                    label="Workflow"
                    onClick={() => navigate(`/workflow/${project.id}`)}
                  />
                  <QuickAction 
                    icon={Palette} 
                    label="Tone"
                    onClick={() => navigate(`/tone/${project.id}`)}
                  />
                  <QuickAction 
                    icon={ImageIcon} 
                    label="Art"
                    onClick={() => navigate(`/art/${project.id}`)}
                  />
                </div>

                {/* Updated timestamp */}
                <p className="text-xs text-muted-foreground">
                  Updated {formatDate(project.updated_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="new-project-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Start New Book</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter book title"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="rounded-sm"
                  data-testid="new-project-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="series">Series Name</Label>
                <Input
                  id="series"
                  placeholder="e.g., Bigfoot Financial Adventures"
                  value={newProject.series_name}
                  onChange={(e) => setNewProject({ ...newProject, series_name: e.target.value })}
                  className="rounded-sm"
                  data-testid="new-project-series"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="universe">Universe</Label>
                <Input
                  id="universe"
                  placeholder="e.g., Evergreen Forest"
                  value={newProject.universe}
                  onChange={(e) => setNewProject({ ...newProject, universe: e.target.value })}
                  className="rounded-sm"
                  data-testid="new-project-universe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newProject.type}
                  onValueChange={(value) => setNewProject({ ...newProject, type: value })}
                >
                  <SelectTrigger className="rounded-sm" data-testid="new-project-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novel">Novel</SelectItem>
                    <SelectItem value="children">Children's Book</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="short-story">Short Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  placeholder="Brief description of your book..."
                  value={newProject.summary}
                  onChange={(e) => setNewProject({ ...newProject, summary: e.target.value })}
                  className="rounded-sm resize-none"
                  rows={3}
                  data-testid="new-project-summary"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-sm"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={creating}
                className="rounded-sm"
                data-testid="create-project-submit"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
