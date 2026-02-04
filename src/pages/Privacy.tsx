import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Database, Trash2, Download, Server, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Privacy() {
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
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        {/* Title Section */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Privacy Commitment Banner */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-4 text-lg">Our Privacy Commitment</h2>
            <p className="text-muted-foreground mb-4">
              At Smart Agent, we believe your data belongs to you. Unlike some competitors in the real estate 
              software space, we will never share your contacts with third parties or use your data for 
              purposes beyond providing our service.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-900">
                <Lock className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">No Data Selling</p>
                  <p className="text-xs text-muted-foreground">We never sell your data</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-900">
                <Download className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">Full Portability</p>
                  <p className="text-xs text-muted-foreground">Export anytime you want</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-900">
                <Trash2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">Right to Delete</p>
                  <p className="text-xs text-muted-foreground">Request deletion anytime</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              1. Information We Collect
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p><strong>1.1 Information You Provide:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Information:</strong> Name, email address, password, and profile details</li>
                <li><strong>CRM Data:</strong> Contacts, properties, deals, and notes you create</li>
                <li><strong>Documents:</strong> Files you upload for AI analysis (contracts, disclosures, etc.)</li>
                <li><strong>Communications:</strong> Messages sent through the platform</li>
                <li><strong>Payment Information:</strong> Processed securely by Stripe (we don't store card details)</li>
              </ul>
              
              <p><strong>1.2 Information Collected Automatically:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Usage Data:</strong> Features used, pages visited, time spent in app</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
                <li><strong>Log Data:</strong> IP address, access times, error logs for debugging</li>
              </ul>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              2. How We Use Your Information
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We use your information to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide and maintain the Smart Agent service</li>
                <li>Process your documents for AI-powered analysis and search</li>
                <li>Send service-related notifications and updates</li>
                <li>Process payments and manage subscriptions</li>
                <li>Improve our service through anonymized analytics</li>
                <li>Respond to your support requests</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
              
              <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 mt-4">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>We do NOT use your data to:</strong> Train public AI models, sell to third parties, 
                      target you with ads, or share with other real estate platforms.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              3. AI Features and Data Processing
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong>3.1 Document Processing:</strong> When you upload documents, they are processed to 
                extract text, create searchable indexes, and enable AI chat features. Documents are stored 
                encrypted and are only accessible to you.
              </p>
              <p>
                <strong>3.2 AI Conversations:</strong> Your conversations with AI are stored to maintain 
                conversation history and improve your experience. They are not shared externally.
              </p>
              <p>
                <strong>3.3 Third-Party AI:</strong> We use Anthropic's Claude AI for processing. Your data 
                is sent to Anthropic's API under their enterprise terms, which prohibit using customer data 
                for training. See Anthropic's privacy policy for details.
              </p>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Server className="h-5 w-5" />
              4. Data Storage and Security
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong>4.1 Infrastructure:</strong> Your data is stored on Supabase (built on AWS) with 
                encryption at rest and in transit. Our servers are located in the United States.
              </p>
              <p>
                <strong>4.2 Security Measures:</strong> We implement industry-standard security practices 
                including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>TLS/SSL encryption for all data in transit</li>
                <li>AES-256 encryption for data at rest</li>
                <li>Row-level security (RLS) ensuring data isolation between users</li>
                <li>Regular security audits and updates</li>
                <li>Secure authentication with session management</li>
              </ul>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Data Sharing</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We only share your data in limited circumstances:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Service Providers:</strong> Stripe (payments), Anthropic (AI), Resend (email) - 
                only as necessary to provide services</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger or acquisition, with 
                notice to you</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize sharing</li>
              </ul>
              
              <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 mt-4">
                <CardContent className="pt-4">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    We will NEVER sell your contact lists, share your CRM data with real estate portals, 
                    or allow third parties to market to your contacts.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" />
              6. Your Rights and Choices
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Access:</strong> View all data we have about you</li>
                <li><strong>Export:</strong> Download your data in CSV or JSON format at any time</li>
                <li><strong>Correct:</strong> Update inaccurate information in your profile or data</li>
                <li><strong>Delete:</strong> Request deletion of your account and associated data</li>
                <li><strong>Object:</strong> Opt out of non-essential data processing</li>
                <li><strong>Restrict:</strong> Limit how we use your data</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, go to Settings → Data & Privacy, or contact us at{" "}
                <a href="mailto:privacy@smartagent.ai" className="text-primary hover:underline">
                  privacy@smartagent.ai
                </a>
              </p>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Cookies and Tracking</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We use minimal cookies:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Essential:</strong> Authentication and session management (required)</li>
                <li><strong>Analytics:</strong> Anonymous usage analytics via PostHog (can be disabled)</li>
              </ul>
              <p>We do not use advertising cookies or third-party trackers.</p>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Data Retention</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong>Active Account:</strong> We retain your data for as long as your account is active.
              </p>
              <p>
                <strong>After Cancellation:</strong> You have 30 days to export your data. After this period, 
                data is permanently deleted within 90 days.
              </p>
              <p>
                <strong>Legal Holds:</strong> Some data may be retained longer if required for legal compliance.
              </p>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. California Privacy Rights (CCPA)</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>California residents have additional rights:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Right to know what personal information is collected</li>
                <li>Right to delete personal information</li>
                <li>Right to opt-out of the sale of personal information (we don't sell data)</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Smart Agent is not intended for children under 18. We do not knowingly collect information 
              from children. If you believe a child has provided us with personal information, please 
              contact us.
            </p>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant 
              changes via email or in-app notification. Your continued use of Smart Agent after changes 
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions or to exercise your rights:
            </p>
            <ul className="list-none space-y-2 text-muted-foreground mt-4">
              <li>Email: <a href="mailto:privacy@smartagent.ai" className="text-primary hover:underline">privacy@smartagent.ai</a></li>
              <li>Data Protection Officer: <a href="mailto:dpo@smartagent.ai" className="text-primary hover:underline">dpo@smartagent.ai</a></li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Your privacy matters. Read our{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {" "}for complete details.
          </p>
          <Button asChild variant="outline">
            <Link to="/signup">Get Started with Smart Agent</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
