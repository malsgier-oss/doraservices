import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  label?: string;
  aspectRatio?: string;
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  onUpload,
  maxSizeMB = 2,
  acceptedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  label,
  aspectRatio,
  className,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    setError(null);

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError(`File must be one of: ${acceptedFormats.join(", ")}`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const url = await onUpload(file);
      onChange(url);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      toast?.error?.(errorMessage);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors",
          value ? "border-border" : "border-muted-foreground/50",
          "hover:border-primary/50 cursor-pointer"
        )}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {value ? (
          <div className="relative w-full h-full">
            <img
              src={value}
              alt="Upload preview"
              className="w-full h-full object-cover rounded"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => onChange(null)}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground text-center">
              {uploading ? "Uploading..." : "Drop image here or click to select"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats.join(",")}
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Select Image
            </Button>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
