import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectApi, chapterApi, stylePresetApi, artAssetApi, aiApi } from "@/lib/api";
import { toast } from "sonner";
import { 
  Loader2, 
  Sparkles,
  ImageIcon,
  Book,
  FileImage,
  Image,
  Save,
  Trash2
} from "lucide-react";

export default function ArtStudio() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [stylePresets, setStylePresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [artAssets, setArtAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [promptType, setPromptType] = useState("cover");
  const [context, setContext] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        loadChapters(projectId);
        loadArtAssets(projectId);
      }
    }
  }, [projectId, projects]);

  const loadInitialData = async () => {
    try {
      const [projectsRes, presetsRes] = await Promise.all([
        projectApi.getAll(),
        stylePresetApi.getAll()
      ]);
      setProjects(projectsRes.data);
      setStylePresets(presetsRes.data);
      
      if (!projectId && projectsRes.data.length > 0) {
        setSelectedProject(projectsRes.data[0]);
        loadChapters(projectsRes.data[0].id);
        loadArtAssets(projectsRes.data[0].id);
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (projId) => {
    try {
      const res = await chapterApi.getByProject(projId);
      setChapters(res.data);
    } catch (error) {
      console.error("Failed to load chapters");
    }
  };

  const loadArtAssets = async (projId) => {
    try {
      const res = await artAssetApi.getByProject(projId);
      setArtAssets(res.data);
    } catch (error) {
      console.error("Failed to load art assets");
    }
  };

  const handleProjectChange = (projId) => {
    const project = projects.find(p => p.id === projId);
    setSelectedProject(project);
    setSelectedChapter(null);
    navigate(`/art/${projId}`);
    loadChapters(projId);
    loadArtAssets(projId);
    setAiResponse("");
  };

  const handleGeneratePrompts = async () => {
    if (!selectedProject) {
      toast.error("Please select a project");
      return;
    }
    if (!selectedPreset) {
      toast.error("Please select a style preset");
      return;
    }

    setAiLoading(true);
    try {
      const contextText = context || selectedProject.summary || selectedProject.title;
      const res = await aiApi.generateArtPrompts(
        selectedProject.id,
        selectedChapter?.id,
        selectedPreset,
        promptType,
        contextText
      );
      setAiResponse(res.data.response);
    } catch (error) {
      toast.error("Failed to generate art prompts");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAsset = async () => {
    if (!aiResponse || !selectedProject) return;
    
    try {
      await artAssetApi.create({
        project_id: selectedProject.id,
        chapter_id: selectedChapter?.id,
        type: promptType,
        style_preset: selectedPreset,
        prompt_used: aiResponse,
        status: "generated"
      });
      loadArtAssets(selectedProject.id);
      toast.success("Art asset saved!");
    } catch (error) {
      toast.error("Failed to save art asset");
    }
  };

  const handleDeleteAsset = async (assetId) => {
    try {
      await artAssetApi.delete(assetId);
      setArtAssets(artAssets.filter(a => a.id !== assetId));
      toast.success("Asset deleted");
    } catch (error) {
      toast.error("Failed to delete asset");
    }
  };

  const promptTypeOptions = [
    { value: "cover", label: "Cover Art", icon: Book },
    { value: "chapter_header", label: "Chapter Header", icon: FileImage },
    { value: "spot_illustration", label: "Spot Illustration", icon: Image }
  ];

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
        <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="font-serif text-2xl mb-2">No Projects Yet</h2>
        <p className="text-muted-foreground mb-4">Create a project to generate art prompts</p>
        <Button onClick={() => navigate("/")} className="rounded-sm">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto animate-fade-in" data-testid="art-studio">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight">
            Art Studio
          </h1>
          <p className="mt-2 text-muted-foreground">
            Generate visual prompts for your book
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedProject?.id}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-48 rounded-sm" data-testid="art-project-select">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Generate Art Prompts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Prompt Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt Type</label>
                <Select value={promptType} onValueChange={setPromptType}>
                  <SelectTrigger className="rounded-sm" data-testid="prompt-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {promptTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Style Preset */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Style Preset</label>
                <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                  <SelectTrigger className="rounded-sm" data-testid="style-preset-select">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {stylePresets.length > 0 ? (
                      stylePresets.map(preset => (
                        <SelectItem key={preset.id} value={preset.name}>
                          {preset.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="default" disabled>
                        No presets - create one in Settings
                      </SelectItem>
                    )}
                    <SelectItem value="Bigfoot Adventure">Bigfoot Adventure</SelectItem>
                    <SelectItem value="Evergreen Mythic">Evergreen Mythic</SelectItem>
                    <SelectItem value="Whimsical Children">Whimsical Children</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Chapter (optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Chapter (optional)</label>
                <Select 
                  value={selectedChapter?.id || "none"} 
                  onValueChange={(v) => setSelectedChapter(v === "none" ? null : chapters.find(c => c.id === v))}
                >
                  <SelectTrigger className="rounded-sm" data-testid="art-chapter-select">
                    <SelectValue placeholder="All chapters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All chapters</SelectItem>
                    {chapters.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.chapter_number}. {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Context</label>
              <Textarea
                placeholder="Describe the scene, mood, or specific elements you want in the artwork..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="min-h-[100px] rounded-sm resize-none"
                data-testid="art-context-input"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGeneratePrompts}
                disabled={aiLoading || !selectedPreset}
                className="flex-1 rounded-sm"
                data-testid="generate-art-btn"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate {promptTypeOptions.find(o => o.value === promptType)?.label} Ideas
                  </>
                )}
              </Button>
              {aiResponse && (
                <Button
                  variant="outline"
                  onClick={handleSaveAsset}
                  className="rounded-sm"
                  data-testid="save-art-asset-btn"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Asset
                </Button>
              )}
            </div>

            {/* AI Response */}
            {aiResponse && (
              <div className="mt-4 p-4 bg-muted rounded-sm">
                <ScrollArea className="max-h-[300px]">
                  <div className="ai-response text-sm whitespace-pre-wrap" data-testid="art-ai-response">
                    {aiResponse}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Saved Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {artAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm text-center">
                    No saved art assets yet. Generate prompts and save them here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {artAssets.map((asset) => (
                    <div 
                      key={asset.id} 
                      className="p-3 bg-muted rounded-sm"
                      data-testid={`art-asset-${asset.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="capitalize text-xs">
                          {asset.type.replace("_", " ")}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteAsset(asset.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Style: {asset.style_preset}
                      </p>
                      <p className="text-xs line-clamp-3">
                        {asset.prompt_used.substring(0, 150)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
