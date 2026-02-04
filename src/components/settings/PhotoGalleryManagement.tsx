import { useState, useRef } from "react";
import { Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileExtensions } from "@/hooks/useProfileExtensions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function PhotoGalleryManagement() {
  const { user } = useAuth();
  const { gallery, isLoading, addGalleryItem, deleteGalleryItem } = useProfileExtensions();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 10MB");
      return;
    }

    // Upload to Supabase Storage
    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Add to gallery
      await addGalleryItem.mutateAsync({
        storage_path: filePath,
        filename: file.name,
      });

      toast.success("Photo uploaded successfully");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("profile-photos")
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      await deleteGalleryItem.mutateAsync(id);

      toast.success("Photo deleted successfully");
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    }
  };

  const getPhotoUrl = (storagePath: string) => {
    const { data } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(storagePath);
    return data.publicUrl;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Photo Gallery
            </CardTitle>
            <CardDescription>
              Add photos to showcase your work and personality
            </CardDescription>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-1 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading gallery...</p>
        ) : gallery.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              No photos added yet
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Upload images up to 10MB (JPG, PNG, WebP)
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload Photo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {gallery.map((item) => (
              <div key={item.id} className="relative group">
                <img
                  src={getPhotoUrl(item.storage_path)}
                  alt={item.caption || item.filename}
                  className="w-full h-40 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.id, item.storage_path)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
                {item.caption && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {item.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {gallery.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            {gallery.length} photo{gallery.length !== 1 ? "s" : ""} in your gallery
          </p>
        )}
      </CardContent>
    </Card>
  );
}
