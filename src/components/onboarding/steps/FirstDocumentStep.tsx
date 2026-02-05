import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, FileText, Upload, SkipForward, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentIndexing } from "@/hooks/useDocumentIndexing";
import { toast } from "sonner";
import type { OnboardingData } from "@/hooks/useOnboarding";

interface FirstDocumentStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function FirstDocumentStep({ data, updateData, onNext, onBack, onSkip }: FirstDocumentStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const { uploadAndIndexDocument, isUploading, progress } = useDocumentIndexing();

  const handleFileSelect = (file: File) => {
    const allowedTypes = ["application/pdf", "text/plain", "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", { description: "Please upload a PDF, Word document, or text file." });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", { description: "Please upload a file smaller than 10MB." });
      return;
    }

    setUploadedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    try {
      await uploadAndIndexDocument(uploadedFile);
      toast.success("Document uploaded!", { description: "Your document is being processed by our AI." });
      updateData({ documentUploaded: true });
      onNext();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed", { description: "Failed to upload document. Please try again." });
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Upload Your First Document</CardTitle>
        <CardDescription>
          Upload a contract, disclosure, or any real estate document. Our AI will analyze it for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedFile ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              "hover:border-primary/50 hover:bg-accent/50 cursor-pointer",
              isDragging && "border-primary bg-primary/5"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">Drop your document here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              PDF, Word, or text files up to 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{uploadedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {isUploading ? (
                <div className="text-sm text-muted-foreground">
                  {progress}%
                </div>
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {uploadedFile ? (
            <Button onClick={handleUpload} className="flex-1" disabled={isUploading}>
              {isUploading ? `Uploading ${progress}%...` : "Upload & Continue"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onSkip} className="flex-1">
              <SkipForward className="h-4 w-4 mr-2" />
              Skip for now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
