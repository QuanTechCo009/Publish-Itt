import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { versionsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Plus, 
  History, 
  Eye, 
  Trash2,
  Loader2,
  GitBranch,
  Clock,
  RotateCcw
} from "lucide-react";

export default function VersionsPanel({ 
  parentType, 
  parentId, 
  currentContent,
  onRestoreVersion 
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [newVersionLabel, setNewVersionLabel] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (parentId) {
      loadVersions();
    }
  }, [parentType, parentId]);

  const loadVersions = async () => {
    if (!parentId) return;
    setLoading(true);
    try {
      const res = await versionsApi.getByParent(parentType, parentId);
      setVersions(res.data);
    } catch (error) {
      console.error("Failed to load versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!newVersionLabel.trim()) {
      toast.error("Please enter a version label");
      return;
    }

    setCreating(true);
    try {
      await versionsApi.create({
        parent_type: parentType,
        parent_id: parentId,
        content_snapshot: currentContent,
        label: newVersionLabel,
        created_by: "author"
      });
      toast.success("Version snapshot saved");
      setCreateDialogOpen(false);
      setNewVersionLabel("");
      loadVersions();
    } catch (error) {
      toast.error("Failed to create version");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteVersion = async () => {
    if (!selectedVersion) return;
    
    try {
      await versionsApi.delete(selectedVersion.id);
      toast.success("Version deleted");
      setDeleteDialogOpen(false);
      setSelectedVersion(null);
      loadVersions();
    } catch (error) {
      toast.error("Failed to delete version");
    }
  };

  const handleRestoreVersion = () => {
    if (selectedVersion && onRestoreVersion) {
      onRestoreVersion(selectedVersion.content_snapshot);
      setViewDialogOpen(false);
      toast.success("Version restored to editor");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!parentId) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <History className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Select a chapter to view versions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="versions-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Version History</span>
          <Badge variant="secondary" className="text-xs">
            {versions.length}
          </Badge>
        </div>
        <Button 
          size="sm" 
          onClick={() => setCreateDialogOpen(true)}
          className="rounded-sm h-8"
          data-testid="create-version-btn"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Save Version
        </Button>
      </div>

      {/* Versions List */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : versions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-1">No versions saved yet</p>
            <p className="text-xs text-muted-foreground">
              Save snapshots of your work to track changes
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">
            {versions.map((version, index) => (
              <Card 
                key={version.id} 
                className="card-hover cursor-pointer"
                onClick={() => {
                  setSelectedVersion(version);
                  setViewDialogOpen(true);
                }}
                data-testid={`version-item-${version.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {version.label || `Version ${versions.length - index}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(version.created_at)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVersion(version);
                        setDeleteDialogOpen(true);
                      }}
                      data-testid={`delete-version-${version.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Create Version Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="create-version-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif">Save Version Snapshot</DialogTitle>
            <DialogDescription>
              Create a snapshot of the current content to track your changes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="versionLabel">Version Label</Label>
            <Input
              id="versionLabel"
              value={newVersionLabel}
              onChange={(e) => setNewVersionLabel(e.target.value)}
              placeholder="e.g., First draft, After review..."
              className="mt-2 rounded-sm"
              data-testid="version-label-input"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCreateDialogOpen(false)} 
              className="rounded-sm"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateVersion} 
              disabled={creating}
              className="rounded-sm"
              data-testid="save-version-submit"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Version"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Version Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl" data-testid="view-version-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {selectedVersion?.label || "Version Snapshot"}
            </DialogTitle>
            <DialogDescription>
              {selectedVersion && formatDate(selectedVersion.created_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[300px] border rounded-sm p-4">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: selectedVersion?.content_snapshot || "" 
                }}
              />
            </ScrollArea>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setViewDialogOpen(false)} 
              className="rounded-sm"
            >
              Close
            </Button>
            <Button 
              onClick={handleRestoreVersion}
              className="rounded-sm"
              data-testid="restore-version-btn"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore This Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-version-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the version "{selectedVersion?.label}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteVersion}
              className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-version-btn"
            >
              Delete Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
