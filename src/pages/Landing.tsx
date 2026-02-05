import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles,
  FileText,
  Users,
  MessageSquare,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Menu,
} from "lucide-react";

export default function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Smart Agent</span>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            <a href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
            <a href="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
            <Button variant="ghost" asChild>
              <a href="/login">Log In</a>
            </Button>
            <Button asChild>
              <a href="/signup">Get Started</a>
            </Button>
          </nav>

          {/* Mobile nav */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="flex flex-col gap-4 mt-8">
                <a
                  href="/about"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </a>
                <a
                  href="/contact"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </a>
                <Button variant="ghost" asChild className="justify-start">
                  <a href="/login" onClick={() => setMobileMenuOpen(false)}>Log In</a>
                </Button>
                <Button asChild>
                  <a href="/signup" onClick={() => setMobileMenuOpen(false)}>Get Started</a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container px-4 py-20 mx-auto max-w-7xl text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI-Powered Real Estate Assistant</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Streamline Your Real Estate Business with AI
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Smart Agent combines AI-powered document analysis, comprehensive CRM, and intelligent
              multi-document chat to help real estate professionals work smarter and close deals faster.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button size="lg" asChild>
                <a href="/signup">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/about">Learn More</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required • 14-day free trial
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container px-4 py-20 mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Succeed</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed specifically for real estate professionals
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">AI Document Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload contracts, inspections, and appraisals. Get instant AI summaries,
                    structured data extraction, and intelligent insights.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Comprehensive CRM</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage contacts, properties, and deals in one place. Track your pipeline
                    and never miss a follow-up with smart reminders.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Multi-Document Chat</h3>
                  <p className="text-sm text-muted-foreground">
                    Ask questions across multiple documents simultaneously. Compare contracts,
                    extract insights, and get instant answers.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Pipeline Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Visualize your deals from lead to close. Track milestones, manage tasks,
                    and optimize your sales process.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Enterprise Security</h3>
                  <p className="text-sm text-muted-foreground">
                    Bank-level encryption, multi-tenant isolation, and SOC 2 compliance.
                    Your data is always protected.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
                  <p className="text-sm text-muted-foreground">
                    Built on modern technology for instant search, real-time updates,
                    and seamless performance across all devices.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="container px-4 py-20 mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Why Real Estate Pros Choose Smart Agent</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Save 10+ Hours Per Week</h3>
                    <p className="text-sm text-muted-foreground">
                      Automate document analysis, data entry, and routine follow-ups so you can
                      focus on building relationships and closing deals.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Close Deals 30% Faster</h3>
                    <p className="text-sm text-muted-foreground">
                      Intelligent pipeline management and automated reminders ensure no opportunity
                      slips through the cracks.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Instant Document Insights</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload any real estate document and get AI-powered summaries, key dates,
                      financial details, and action items in seconds.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Work From Anywhere</h3>
                    <p className="text-sm text-muted-foreground">
                      Cloud-based platform works on desktop, tablet, and mobile. Access your data
                      from showings, open houses, or the office.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="text-center space-y-4">
                <div className="text-5xl font-bold text-primary">95%</div>
                <p className="text-lg font-medium">Customer Satisfaction</p>
                <div className="pt-4 space-y-2">
                  <p className="text-sm text-muted-foreground italic">
                    "Smart Agent has transformed how I manage my business. The AI document
                    analysis alone saves me hours every week."
                  </p>
                  <p className="text-sm font-medium">— Sarah Mitchell, Top Producer</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container px-4 py-20 mx-auto max-w-7xl">
          <Card className="p-12 bg-primary text-primary-foreground text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Join hundreds of real estate professionals using Smart Agent to work smarter,
              save time, and close more deals.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <a href="/signup">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent hover:bg-primary-foreground/10" asChild>
                <a href="/contact">Contact Sales</a>
              </Button>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container px-4 py-12 mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">Smart Agent</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered assistant for real estate professionals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</a></li>
                <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="/help" className="text-muted-foreground hover:text-foreground transition-colors">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="https://twitter.com/smartagentai" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Twitter</a></li>
                <li><a href="https://linkedin.com/company/smartagent" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Smart Agent. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
