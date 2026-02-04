import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, HelpCircle, Phone } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Message sent!",
        description: "We'll get back to you within 24-48 hours.",
      });
      setIsSubmitting(false);
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <AppLayout>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions or need support? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Contact Methods */}
            <div className="md:col-span-1 space-y-4">
              <Card className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <a href="mailto:support@smartagent.ai" className="text-sm text-primary hover:underline">
                      support@smartagent.ai
                    </a>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  For general inquiries and support requests.
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Chat Support</h3>
                    <p className="text-sm text-muted-foreground">
                      Available in-app
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get instant help through our AI assistant or connect with support staff.
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <HelpCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Help Center</h3>
                    <a href="/help" className="text-sm text-primary hover:underline">
                      Visit Help Center
                    </a>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Browse our documentation and FAQs for quick answers.
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Phone</h3>
                    <p className="text-sm text-muted-foreground">
                      1-800-SMART-AI
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Mon-Fri, 9am-5pm EST
                </p>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="md:col-span-2 p-6">
              <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="What's this about?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us how we can help..."
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company (Optional)</Label>
                  <Input
                    id="company"
                    name="company"
                    placeholder="Your real estate company"
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By submitting this form, you agree to our{" "}
                  <a href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                  . We typically respond within 24-48 hours.
                </p>
              </form>
            </Card>
          </div>

          {/* Additional Info */}
          <Card className="p-8 bg-muted/50">
            <h2 className="text-2xl font-semibold mb-4">Business Hours</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Support Team</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Monday - Friday: 9:00 AM - 9:00 PM EST</li>
                  <li>Saturday: 10:00 AM - 6:00 PM EST</li>
                  <li>Sunday: Closed</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Sales Team</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Monday - Friday: 8:00 AM - 7:00 PM EST</li>
                  <li>Saturday: By appointment</li>
                  <li>Sunday: Closed</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}
