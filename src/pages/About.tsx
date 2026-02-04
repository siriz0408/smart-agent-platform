import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Sparkles, Target, Users, Shield, Zap } from "lucide-react";

export default function About() {
  return (
    <AppLayout>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">About Smart Agent</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI-powered platform revolutionizing how real estate professionals manage documents, relationships, and deals.
            </p>
          </div>

          {/* Mission Section */}
          <Card className="p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-3">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Smart Agent was built to empower real estate professionals with cutting-edge AI technology.
                  We believe that by automating routine tasks and providing intelligent insights, agents can
                  focus on what matters most: building relationships and closing deals. Our platform combines
                  document intelligence, CRM capabilities, and AI-powered chat to create a comprehensive solution
                  for modern real estate workflows.
                </p>
              </div>
            </div>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI Document Analysis</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload real estate documents and get instant AI-powered analysis, summaries, and structured data extraction.
                Our intelligent system recognizes contracts, inspections, appraisals, and more.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Comprehensive CRM</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage contacts, properties, and deals in one place. Track your pipeline, nurture relationships,
                and never miss a follow-up with intelligent reminders and insights.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Multi-Document Chat</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Chat with multiple documents simultaneously using our RAG-powered AI. Ask questions across
                contracts, get comparisons, and extract insights from your entire document library.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Enterprise Security</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Your data is protected with enterprise-grade security, multi-tenant isolation, row-level security,
                and encrypted storage. We take data privacy seriously and comply with industry standards.
              </p>
            </Card>
          </div>

          {/* Technology Stack */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-4">Built with Modern Technology</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Smart Agent is built on a modern, scalable technology stack including React, TypeScript,
              Supabase (PostgreSQL with pgvector for embeddings), and Anthropic Claude AI for natural language
              understanding. We leverage cutting-edge vector search and RAG (Retrieval-Augmented Generation)
              techniques to provide accurate, context-aware AI responses.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our platform is designed for real estate professionals of all sizes - from independent agents
              to large brokerages. We continuously innovate and improve based on user feedback to deliver
              the best possible experience.
            </p>
          </Card>

          {/* Team/Contact CTA */}
          <Card className="p-8 bg-primary/5 border-primary/20">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">Want to Learn More?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Get in touch with our team to learn how Smart Agent can transform your real estate business.
              </p>
              <div className="flex gap-4 justify-center pt-2">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Contact Us
                </a>
                <a
                  href="/help"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Get Help
                </a>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}
