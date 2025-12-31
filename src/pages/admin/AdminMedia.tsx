import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Trash2, Eye, Image as ImageIcon, User, Briefcase } from "lucide-react";

interface MediaFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, unknown>;
  bucket: string;
  url: string;
}

export default function AdminMedia() {
  const queryClient = useQueryClient();
  const [bucketFilter, setBucketFilter] = useState<string>("avatars");
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: files, isLoading } = useQuery({
    queryKey: ["admin-media", bucketFilter],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucketFilter).list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

      if (error) throw error;

      // Get public URLs for each file
      const filesWithUrls = await Promise.all(
        (data || [])
          .filter((file) => file.name !== ".emptyFolderPlaceholder")
          .map(async (file) => {
            const { data: urlData } = supabase.storage
              .from(bucketFilter)
              .getPublicUrl(file.name);

            return {
              ...file,
              bucket: bucketFilter,
              url: urlData.publicUrl,
            };
          })
      );

      return filesWithUrls;
    },
  });

  const deleteFile = useMutation({
    mutationFn: async ({ bucket, name }: { bucket: string; name: string }) => {
      const { error } = await supabase.storage.from(bucket).remove([name]);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "media_deleted",
        p_target_type: "media",
        p_details: { bucket, name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      toast.success("File deleted");
    },
    onError: () => {
      toast.error("Failed to delete file");
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype?.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <ImageIcon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Media</h1>
          <p className="text-muted-foreground">Manage uploaded files and images</p>
        </div>
        <Select value={bucketFilter} onValueChange={setBucketFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select bucket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="avatars">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Avatars
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Files ({files?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : files?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No files found</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {files?.map((file) => (
                <div
                  key={file.id}
                  className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                >
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        setSelectedMedia(file);
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this file?")) {
                          deleteFile.mutate({ bucket: file.bucket, name: file.name });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-white text-xs truncate">
                    {file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.name}
                  className="max-h-96 object-contain rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">File Name</p>
                  <p className="font-medium break-all">{selectedMedia.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bucket</p>
                  <p className="font-medium">{selectedMedia.bucket}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">
                    {selectedMedia.metadata?.size
                      ? formatFileSize(Number(selectedMedia.metadata.size))
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {String(selectedMedia.metadata?.mimetype || "Unknown")}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Public URL</p>
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  {selectedMedia.url}
                </code>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedMedia && confirm("Are you sure you want to delete this file?")) {
                  deleteFile.mutate({ bucket: selectedMedia.bucket, name: selectedMedia.name });
                  setPreviewOpen(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
