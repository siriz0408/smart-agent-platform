import { useState } from "react";
import {
  Search,
  ChevronRight,
  FileText,
  MessageSquare,
  Users,
  Home,
  Building2,
  Bot,
  CreditCard,
  Settings,
  ExternalLink,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AppLayout } from "@/components/layout/AppLayout";

// Help article data
const helpCategories = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Home,
    description: "Learn the basics of Smart Agent",
    articles: [
      {
        id: "welcome",
        title: "Welcome to Smart Agent",
        content: `Smart Agent is your AI-powered real estate assistant. Here's what you can do:

• **AI Chat**: Ask questions about your documents or search for properties
• **Document Analysis**: Upload contracts, disclosures, and other documents for AI analysis
• **CRM**: Manage your contacts and track deals through your pipeline
• **Property Search**: Find properties with our integrated search tools

To get started, try uploading a document or asking the AI a question!`,
      },
      {
        id: "first-document",
        title: "Uploading Your First Document",
        content: `To upload a document:

1. Go to the **Documents** page
2. Click the **Upload** button
3. Select a PDF, DOCX, or text file
4. Wait for the AI to analyze the document
5. Chat with the document to extract key information

**Supported formats**: PDF, DOCX, TXT, RTF
**Maximum file size**: 20MB`,
      },
      {
        id: "first-contact",
        title: "Adding Your First Contact",
        content: `To add a contact:

1. Go to the **Contacts** page
2. Click **Add Contact**
3. Fill in their name, email, and phone
4. Select a contact type (Lead, Buyer, Seller, etc.)
5. Click **Save**

**Pro tip**: You can import multiple contacts at once using the **Import CSV** button!`,
      },
    ],
  },
  {
    id: "documents",
    title: "Documents & AI",
    icon: FileText,
    description: "Document upload, analysis, and AI chat",
    articles: [
      {
        id: "doc-types",
        title: "Supported Document Types",
        content: `Smart Agent can analyze these real estate document types:

• **Contracts**: Purchase agreements, listing contracts
• **Disclosures**: Seller disclosures, lead paint notices
• **Inspections**: Home inspection reports
• **Appraisals**: Property appraisal reports
• **Settlements**: HUD-1/Closing disclosure statements
• **General**: Any other text-based documents

The AI will automatically detect the document type and extract relevant information.`,
      },
      {
        id: "ai-chat",
        title: "Using AI Chat",
        content: `The AI chat can help you:

• **Answer questions** about your documents
• **Extract key data** like prices, dates, and parties
• **Compare documents** when multiple are selected
• **Search for properties** in your target areas
• **Summarize** long documents quickly

**Tips for better results**:
- Be specific in your questions
- Reference document names when asking about specific files
- Use follow-up questions to dive deeper`,
      },
      {
        id: "doc-collections",
        title: "Document Collections",
        content: `Organize your documents with collections:

1. Create a collection for each deal or client
2. Add related documents to the collection
3. Chat with multiple documents at once
4. Share collections with team members

Collections help you keep documents organized and make multi-document analysis easier.`,
      },
    ],
  },
  {
    id: "contacts",
    title: "Contacts & CRM",
    icon: Users,
    description: "Managing contacts, leads, and clients",
    articles: [
      {
        id: "contact-types",
        title: "Contact Types Explained",
        content: `Smart Agent uses these contact types:

• **Lead**: Potential client not yet committed
• **Buyer**: Client looking to purchase property
• **Seller**: Client looking to sell property
• **Agent**: Another real estate agent (for co-broker deals)
• **Vendor**: Service providers (inspectors, lenders, etc.)
• **Both**: Client who is both buying and selling

You can change a contact's type at any time from their profile.`,
      },
      {
        id: "import-contacts",
        title: "Importing Contacts from CSV",
        content: `To import contacts in bulk:

1. Go to **Contacts** page
2. Click **Import CSV**
3. Download the sample template or use your own CSV
4. Map your columns to our fields
5. Review and confirm the import

**Required columns**: first_name, last_name
**Optional**: email, phone, contact_type, company, notes, address`,
      },
      {
        id: "messaging",
        title: "Messaging Contacts",
        content: `Communicate with your contacts directly:

1. Open a contact's profile
2. Click the **Message** button
3. Type your message and send
4. View conversation history anytime

Messages are stored in your conversation history and can be searched later.`,
      },
    ],
  },
  {
    id: "pipeline",
    title: "Pipeline & Deals",
    icon: Building2,
    description: "Track deals through your sales pipeline",
    articles: [
      {
        id: "pipeline-stages",
        title: "Understanding Pipeline Stages",
        content: `Default pipeline stages:

1. **Lead** - Initial contact made
2. **Consultation** - Meeting scheduled or completed
3. **Active Search** - Actively showing properties
4. **Under Contract** - Offer accepted
5. **Due Diligence** - Inspections and contingencies
6. **Clear to Close** - All conditions met
7. **Closed** - Transaction completed

Drag and drop deals between stages to update their status.`,
      },
      {
        id: "deal-milestones",
        title: "Deal Milestones",
        content: `Track important dates for each deal:

• **Offer date** - When offer was submitted
• **Contract date** - When contract was signed
• **Inspection deadline** - Due diligence period
• **Financing deadline** - Loan approval deadline
• **Closing date** - Scheduled closing

Set up milestone reminders to never miss a deadline!`,
      },
    ],
  },
  {
    id: "ai-agents",
    title: "AI Agents",
    icon: Bot,
    description: "Custom AI agents for automation",
    articles: [
      {
        id: "what-are-agents",
        title: "What Are AI Agents?",
        content: `AI Agents are custom automations that can:

• Process documents automatically
• Send notifications and reminders
• Generate reports and summaries
• Analyze market data
• Assist with client communications

Create agents tailored to your specific workflow needs.`,
      },
      {
        id: "create-agent",
        title: "Creating Your First Agent",
        content: `To create an AI agent:

1. Go to the **Agents** page
2. Click **Create Agent**
3. Give it a name and description
4. Define the trigger (manual, scheduled, or automatic)
5. Configure the agent's actions
6. Test and activate

Start with simple agents and add complexity as you learn.`,
      },
    ],
  },
  {
    id: "billing",
    title: "Billing & Subscription",
    icon: CreditCard,
    description: "Plans, payments, and account management",
    articles: [
      {
        id: "plans",
        title: "Available Plans",
        content: `Smart Agent offers these plans:

**Free Trial** (14 days)
- Full access to all features
- 5 document uploads
- 50 AI chat messages

**Professional** ($29/month)
- Unlimited documents
- Unlimited AI chat
- Priority support
- Team collaboration

**Enterprise** (Contact us)
- Custom integrations
- Dedicated support
- Volume discounts
- Custom training`,
      },
      {
        id: "manage-subscription",
        title: "Managing Your Subscription",
        content: `From the **Billing** page you can:

• View your current plan and usage
• Upgrade or downgrade your plan
• Update payment method
• View invoice history
• Cancel subscription

Changes to your plan take effect immediately.`,
      },
    ],
  },
];

// FAQ data
const faqs = [
  {
    question: "How secure is my data?",
    answer: "Your data is encrypted at rest and in transit. We use industry-standard security practices and never share your data with third parties. You can export or delete your data at any time.",
  },
  {
    question: "Can I use Smart Agent on mobile?",
    answer: "Yes! Smart Agent is fully responsive and works on any device. We also offer native iOS and Android apps for the best mobile experience.",
  },
  {
    question: "How accurate is the AI document analysis?",
    answer: "Our AI is trained specifically for real estate documents and achieves high accuracy. However, always verify important details manually. The AI is a tool to help you work faster, not a replacement for professional review.",
  },
  {
    question: "Can I share documents with my team?",
    answer: "Yes, Professional and Enterprise plans include team collaboration features. You can share documents, collections, and contacts with team members.",
  },
  {
    question: "What if I need help with something not covered here?",
    answer: "Contact our support team at support@smartagent.ai or use the chat widget in the bottom right corner. We typically respond within 24 hours.",
  },
  {
    question: "Can I integrate Smart Agent with other tools?",
    answer: "Enterprise plans include API access and custom integrations. Contact us to discuss your specific integration needs.",
  },
];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  // Filter categories and articles based on search
  const filteredCategories = searchQuery
    ? helpCategories
        .map((category) => ({
          ...category,
          articles: category.articles.filter(
            (article) =>
              article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              article.content.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((category) => category.articles.length > 0)
    : helpCategories;

  const currentCategory = selectedCategory
    ? helpCategories.find((c) => c.id === selectedCategory)
    : null;

  const currentArticle = currentCategory && selectedArticle
    ? currentCategory.articles.find((a) => a.id === selectedArticle)
    : null;

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Help Center</h1>
          </div>
          <p className="text-muted-foreground">
            Find answers, guides, and tips for using Smart Agent
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedCategory(null);
              setSelectedArticle(null);
            }}
            className="pl-10"
          />
        </div>

        {/* Breadcrumb when viewing article */}
        {selectedCategory && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => {
                setSelectedCategory(null);
                setSelectedArticle(null);
              }}
            >
              Help Center
            </Button>
            <ChevronRight className="h-4 w-4" />
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => setSelectedArticle(null)}
            >
              {currentCategory?.title}
            </Button>
            {currentArticle && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span>{currentArticle.title}</span>
              </>
            )}
          </div>
        )}

        {/* Content */}
        {!selectedCategory ? (
          <>
            {/* Category Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {filteredCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Card
                    key={category.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{category.title}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{category.articles.length} articles</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* FAQ Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Contact Support */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Still need help?</h3>
                      <p className="text-sm text-muted-foreground">
                        Our support team is here to help you succeed
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <a href="mailto:support@smartagent.ai">
                        Email Support
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          // Category/Article View
          <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
            {/* Sidebar */}
            <div className="space-y-2">
              {currentCategory?.articles.map((article) => (
                <Button
                  key={article.id}
                  variant={selectedArticle === article.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedArticle(article.id)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {article.title}
                </Button>
              ))}
            </div>

            {/* Article Content */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{currentCategory?.title}</Badge>
                </div>
                <CardTitle>
                  {currentArticle?.title || "Select an article"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentArticle ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {currentArticle.content.split("\n\n").map((paragraph, idx) => (
                      <p key={idx} className="whitespace-pre-line">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Select an article from the sidebar to view its content.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
