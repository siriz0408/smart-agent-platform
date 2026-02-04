import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Shield, Scale, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Terms() {
  const lastUpdated = "February 4, 2026";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Back to Smart Agent</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        {/* Title Section */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Key Points Summary */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Key Points Summary
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong>Your Data, Your Property:</strong> You own all data you create in Smart Agent</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong>Export Anytime:</strong> Download your data in standard formats at any time</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong>No Data Selling:</strong> We never sell or share your data with third parties</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong>AI Privacy:</strong> Your conversations are not used to train AI models</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Terms Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Scale className="h-5 w-5" />
              1. Agreement to Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Smart Agent ("the Service"), you agree to be bound by these Terms of Service. 
              If you disagree with any part of the terms, you may not access the Service. Smart Agent is a 
              real estate CRM platform with AI-powered features designed for real estate professionals, 
              buyers, and sellers.
            </p>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Smart Agent provides:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Customer relationship management (CRM) tools for real estate professionals</li>
              <li>AI-powered document analysis and chat functionality</li>
              <li>Contact and property management features</li>
              <li>Deal pipeline tracking and management</li>
              <li>AI agents for content generation and analysis</li>
              <li>Messaging and communication tools</li>
            </ul>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              3. Data Ownership and Rights
            </h2>
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 mb-4">
              <CardContent className="pt-4">
                <p className="font-medium text-green-800 dark:text-green-200">
                  You retain full ownership of all data you input into Smart Agent.
                </p>
              </CardContent>
            </Card>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong>3.1 Your Data:</strong> All contacts, properties, documents, deals, and other information 
                you create or upload to Smart Agent ("Your Data") remains your property. We claim no ownership 
                rights over Your Data.
              </p>
              <p>
                <strong>3.2 Export Rights:</strong> You may export Your Data at any time through our export 
                functionality. We support standard formats including CSV and JSON to ensure portability.
              </p>
              <p>
                <strong>3.3 Data Retention:</strong> Upon account termination, you will have 30 days to export 
                Your Data. After this period, Your Data will be permanently deleted from our systems.
              </p>
              <p>
                <strong>3.4 No Data Monetization:</strong> We do not sell, rent, or share Your Data with 
                third parties for marketing or advertising purposes. Your contacts remain your contacts.
              </p>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. AI Features and Limitations</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong>4.1 AI-Generated Content:</strong> Smart Agent uses artificial intelligence to provide 
                document analysis, content suggestions, and other AI-powered features. AI-generated content 
                is provided as a tool to assist your work and should be reviewed before use.
              </p>
              <p>
                <strong>4.2 No Legal or Financial Advice:</strong> AI features do not constitute legal, 
                financial, or professional advice. Always consult qualified professionals for important 
                decisions related to real estate transactions.
              </p>
              <p>
                <strong>4.3 AI Privacy:</strong> Your conversations and documents are processed to provide 
                AI features but are not used to train public AI models. Your data stays private.
              </p>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. User Responsibilities</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>You agree to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide accurate information when creating your account</li>
                <li>Maintain the security of your account credentials</li>
                <li>Comply with all applicable real estate laws and regulations</li>
                <li>Respect Fair Housing laws in all communications generated using the Service</li>
                <li>Obtain necessary consent before uploading documents containing third-party information</li>
                <li>Not use the Service for any unlawful purpose</li>
              </ul>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Subscription and Billing</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong>6.1 Free Tier:</strong> Basic features are available at no cost with usage limits.
              </p>
              <p>
                <strong>6.2 Paid Plans:</strong> Premium features require a paid subscription. Billing is 
                processed through Stripe. You may cancel at any time.
              </p>
              <p>
                <strong>6.3 Refunds:</strong> We offer a 14-day money-back guarantee for first-time 
                subscribers of paid plans.
              </p>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Limitation of Liability</h2>
            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Smart Agent is provided "as is" without warranties of any kind. We are not liable for 
                    any indirect, incidental, special, consequential, or punitive damages resulting from 
                    your use of the Service.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. We will notify you of any material changes 
              via email or through the Service. Your continued use of the Service after such changes 
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@smartagent.ai" className="text-primary hover:underline">
                legal@smartagent.ai
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground mb-4">
            By using Smart Agent, you agree to these Terms of Service and our{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
          <Button asChild variant="outline">
            <Link to="/signup">Get Started with Smart Agent</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
