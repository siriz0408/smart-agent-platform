import { useState, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  uploading?: boolean;
  progress?: number;
  url?: string;
  error?: string;
}

interface PropertyPhotoUploadProps {
  photos: PhotoFile[];
  onPhotosChange: (photos: PhotoFile[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PropertyPhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  maxSizeMB = 5,
  disabled = false,
}: PropertyPhotoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "File must be JPG, PNG, or WebP";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File must be under ${maxSizeMB}MB`;
    }
    return null;
  };

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remainingSlots = maxPhotos - photos.length;
      const filesToAdd = fileArray.slice(0, remainingSlots);

      const newPhotos: PhotoFile[] = filesToAdd
        .map((file) => {
          const error = validateFile(file);
          return {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview: URL.createObjectURL(file),
            error: error || undefined,
          };
        })
        .filter((photo) => !photo.error);

      onPhotosChange([...photos, ...newPhotos]);
    },
    [photos, maxPhotos, onPhotosChange, maxSizeMB]
  );

  const removePhoto = useCallback(
    (id: string) => {
      const photo = photos.find((p) => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      onPhotosChange(photos.filter((p) => p.id !== id));
    },
    [photos, onPhotosChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles, disabled]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {canAddMore && (
        <label
          className={cn(
            "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="mb-1 text-sm text-muted-foreground">
              <span className="font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP (max {maxSizeMB}MB each, up to {maxPhotos} photos)
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            onChange={handleFileSelect}
            disabled={disabled}
          />
        </label>
      )}

      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={photo.preview}
                alt="Property preview"
                className="w-full h-full object-cover"
              />
              
              {/* Uploading overlay */}
              {photo.uploading && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  {photo.progress !== undefined && (
                    <Progress value={photo.progress} className="w-3/4 h-1" />
                  )}
                </div>
              )}

              {/* Error overlay */}
              {photo.error && (
                <div className="absolute inset-0 bg-destructive/80 flex items-center justify-center p-2">
                  <p className="text-xs text-destructive-foreground text-center">
                    {photo.error}
                  </p>
                </div>
              )}

              {/* Remove button */}
              {!photo.uploading && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(photo.id)}
                  disabled={disabled}
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && !canAddMore && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <ImageIcon className="h-8 w-8 mb-2" />
          <p className="text-sm">No photos added</p>
        </div>
      )}

      {/* Photo count */}
      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {photos.length} of {maxPhotos} photos
        </p>
      )}
    </div>
  );
}

export type { PhotoFile };
