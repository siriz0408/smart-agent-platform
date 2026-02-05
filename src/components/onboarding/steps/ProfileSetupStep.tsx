import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OnboardingData } from "@/hooks/useOnboarding";

interface ProfileSetupStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ProfileSetupStep({ data, updateData, onNext, onBack }: ProfileSetupStepProps) {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileSetupStep.tsx:INIT',message:'ProfileSetupStep mounted',data:{hasProfile:!!profile,profileId:profile?.id,profileFullName:profile?.full_name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
  // #endregion
  
  const [fullName, setFullName] = useState(data.fullName || profile?.full_name || "");
  const [title, setTitle] = useState(data.title || profile?.title || "");
  const [phone, setPhone] = useState(data.phone || profile?.phone || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileSetupStep.tsx:handleSubmit:ENTRY',message:'handleSubmit called',data:{fullName,title,phone,profileId:profile?.id,hasProfile:!!profile},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!fullName.trim()) {
      toast.error("Name required", { description: "Please enter your name to continue." });
      return;
    }

    setIsLoading(true);
    
    try {
      if (profile?.id) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileSetupStep.tsx:handleSubmit:BEFORE_UPDATE',message:'About to update profile',data:{profileId:profile.id,fullName:fullName.trim()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            title: title.trim() || null,
            phone: phone.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileSetupStep.tsx:handleSubmit:AFTER_UPDATE',message:'Profile update result',data:{error:error?.message||null,errorCode:error?.code||null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        if (error) throw error;
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileSetupStep.tsx:handleSubmit:NO_PROFILE',message:'No profile.id - skipping update',data:{profile},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
        // #endregion
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileSetupStep.tsx:handleSubmit:BEFORE_NEXT',message:'Calling updateData and onNext',data:{fullName,title,phone},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      updateData({ fullName, title, phone });
      onNext();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileSetupStep.tsx:handleSubmit:AFTER_NEXT',message:'onNext called successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileSetupStep.tsx:handleSubmit:ERROR',message:'Error in handleSubmit',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      console.error("Failed to update profile:", error);
      toast.error("Error", { description: "Failed to update profile. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <User className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>
          Tell us a bit about yourself so we can personalize your experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title / Role</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Real Estate Agent"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Saving..." : "Continue"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
