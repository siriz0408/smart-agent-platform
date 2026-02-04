import { useState } from "react";
import { Award, Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileExtensions } from "@/hooks/useProfileExtensions";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const CREDENTIAL_TYPES = [
  "Real Estate License",
  "Broker License",
  "Certification",
  "Designation",
  "Award",
  "Other",
];

export function CredentialsManagement() {
  const { credentials, isLoading, addCredential, deleteCredential } = useProfileExtensions();
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [credentialType, setCredentialType] = useState("");
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [credentialNumber, setCredentialNumber] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");

  const resetForm = () => {
    setCredentialType("");
    setTitle("");
    setIssuer("");
    setIssueDate("");
    setExpiryDate("");
    setCredentialNumber("");
    setVerificationUrl("");
  };

  const handleAdd = async () => {
    if (!title || !credentialType) {
      return;
    }

    await addCredential.mutateAsync({
      credential_type: credentialType,
      title,
      issuer: issuer || null,
      issue_date: issueDate || null,
      expiry_date: expiryDate || null,
      credential_number: credentialNumber || null,
      verification_url: verificationUrl || null,
      is_verified: false,
    });

    resetForm();
    setIsAddOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this credential?")) {
      await deleteCredential.mutateAsync(id);
    }
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Credentials & Certifications
            </CardTitle>
            <CardDescription>
              Manage your professional licenses and certifications
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Credential</DialogTitle>
                <DialogDescription>
                  Add a new license, certification, or professional designation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="credential-type">Type *</Label>
                  <Select value={credentialType} onValueChange={setCredentialType}>
                    <SelectTrigger id="credential-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CREDENTIAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Real Estate Salesperson License"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issuer">Issuing Organization</Label>
                  <Input
                    id="issuer"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    placeholder="e.g., State Real Estate Commission"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue-date">Issue Date</Label>
                    <Input
                      id="issue-date"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry-date">Expiry Date</Label>
                    <Input
                      id="expiry-date"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credential-number">Credential Number</Label>
                  <Input
                    id="credential-number"
                    value={credentialNumber}
                    onChange={(e) => setCredentialNumber(e.target.value)}
                    placeholder="e.g., RE123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verification-url">Verification URL</Label>
                  <Input
                    id="verification-url"
                    type="url"
                    value={verificationUrl}
                    onChange={(e) => setVerificationUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!title || !credentialType}>
                  Add Credential
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading credentials...</p>
        ) : credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No credentials added yet. Click "Add" to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{credential.title}</h4>
                    {credential.is_verified && (
                      <Badge variant="default" className="text-xs">
                        Verified
                      </Badge>
                    )}
                    {credential.expiry_date && isExpired(credential.expiry_date) && (
                      <Badge variant="destructive" className="text-xs">
                        Expired
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {credential.credential_type}
                    {credential.issuer && ` • ${credential.issuer}`}
                  </p>
                  {credential.credential_number && (
                    <p className="text-xs text-muted-foreground mt-1">
                      #{credential.credential_number}
                    </p>
                  )}
                  {(credential.issue_date || credential.expiry_date) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {credential.issue_date && (
                        <>Issued: {format(new Date(credential.issue_date), "MMM yyyy")}</>
                      )}
                      {credential.issue_date && credential.expiry_date && " • "}
                      {credential.expiry_date && (
                        <>Expires: {format(new Date(credential.expiry_date), "MMM yyyy")}</>
                      )}
                    </p>
                  )}
                  {credential.verification_url && (
                    <a
                      href={credential.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      Verify <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(credential.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
