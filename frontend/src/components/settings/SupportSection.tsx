import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, 
  Book, 
  Search, 
  FileText, 
  CreditCard, 
  Users, 
  Settings, 
  Zap,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock knowledge base articles
const knowledgeBaseArticles = [
  {
    id: "1",
    category: "Getting Started",
    icon: Zap,
    articles: [
      { title: "Quick Start Guide", description: "Learn the basics of Invunion in 5 minutes", views: 1234 },
      { title: "Setting Up Your Account", description: "Complete your account configuration", views: 856 },
      { title: "Connecting Your First Bank", description: "Link your bank accounts securely", views: 2341 },
    ]
  },
  {
    id: "2",
    category: "Transactions",
    icon: FileText,
    articles: [
      { title: "Managing Transactions", description: "View, filter, and categorize transactions", views: 987 },
      { title: "Transaction Reconciliation", description: "Match transactions with invoices", views: 654 },
      { title: "Bulk Operations", description: "Handle multiple transactions at once", views: 432 },
    ]
  },
  {
    id: "3",
    category: "Billing & Payments",
    icon: CreditCard,
    articles: [
      { title: "Understanding Your Invoice", description: "Breakdown of billing components", views: 765 },
      { title: "Payment Methods", description: "Add and manage payment options", views: 543 },
      { title: "Subscription Plans", description: "Compare and upgrade plans", views: 876 },
    ]
  },
  {
    id: "4",
    category: "Team & Permissions",
    icon: Users,
    articles: [
      { title: "Inviting Team Members", description: "Add users to your organization", views: 654 },
      { title: "Role-Based Permissions", description: "Configure access levels", views: 432 },
      { title: "User Activity Logs", description: "Monitor team actions", views: 321 },
    ]
  },
  {
    id: "5",
    category: "Technical & API",
    icon: Settings,
    articles: [
      { title: "API Documentation", description: "Integrate with Invunion API", views: 1543 },
      { title: "Webhook Configuration", description: "Set up real-time notifications", views: 876 },
      { title: "Data Export Options", description: "Export your data in various formats", views: 654 },
    ]
  },
];

// Mock previous tickets
const previousTickets = [
  { 
    id: "TKT-2026-001", 
    subject: "API rate limit question", 
    status: "resolved", 
    createdAt: "January 28, 2026",
    lastUpdate: "January 29, 2026"
  },
  { 
    id: "TKT-2026-002", 
    subject: "Invoice reconciliation issue", 
    status: "open", 
    createdAt: "January 27, 2026",
    lastUpdate: "January 28, 2026"
  },
  { 
    id: "TKT-2025-089", 
    subject: "Bank connection error", 
    status: "resolved", 
    createdAt: "December 15, 2025",
    lastUpdate: "December 16, 2025"
  },
];

export function SupportSection() {
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim()) {
      toast({ title: "Error", description: "Subject is required", variant: "destructive" });
      return;
    }
    if (!ticketDescription.trim()) {
      toast({ title: "Error", description: "Description is required", variant: "destructive" });
      return;
    }
    if (!ticketCategory) {
      toast({ title: "Error", description: "Please select a category", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Submit ticket to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ 
        title: "Ticket Submitted", 
        description: "We'll get back to you within 24 hours" 
      });
      setTicketSubject("");
      setTicketDescription("");
      setTicketPriority("");
      setTicketCategory("");
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to submit ticket. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      case "open":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            <Clock className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredArticles = knowledgeBaseArticles.map(category => ({
    ...category,
    articles: category.articles.filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.articles.length > 0);

  return (
    <Tabs defaultValue="ticket" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="ticket" className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Submit Ticket</span>
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">My Tickets</span>
        </TabsTrigger>
        <TabsTrigger value="knowledge" className="flex items-center gap-2">
          <Book className="h-4 w-4" />
          <span className="hidden sm:inline">Knowledge Base</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ticket" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Submit a Support Ticket</CardTitle>
            <CardDescription>
              Describe your issue and our support team will get back to you within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={ticketCategory} onValueChange={setTicketCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="billing">Billing & Payments</SelectItem>
                    <SelectItem value="account">Account & Access</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="integration">Integration & API</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={ticketPriority} onValueChange={setTicketPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - General question</SelectItem>
                    <SelectItem value="medium">Medium - Issue affecting work</SelectItem>
                    <SelectItem value="high">High - Blocking issue</SelectItem>
                    <SelectItem value="urgent">Urgent - System down</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Brief description of your issue"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                placeholder="Please provide as much detail as possible about your issue, including steps to reproduce if applicable..."
                rows={6}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {ticketDescription.length}/2000 characters
              </p>
            </div>

            <Button onClick={handleSubmitTicket} disabled={isSubmitting} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit Ticket"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>My Tickets</CardTitle>
            <CardDescription>View your previous support tickets</CardDescription>
          </CardHeader>
          <CardContent>
            {previousTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No support tickets yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {previousTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ticket.subject}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{ticket.id}</span>
                        <span>•</span>
                        <span>Created: {ticket.createdAt}</span>
                        <span>•</span>
                        <span>Last update: {ticket.lastUpdate}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="knowledge" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Find answers to common questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-6">
                {filteredArticles.map((category) => {
                  const Icon = category.icon;
                  return (
                    <div key={category.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-semibold">{category.category}</h3>
                      </div>
                      <div className="grid gap-2 pl-10">
                        {category.articles.map((article, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                          >
                            <div>
                              <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                {article.title}
                              </p>
                              <p className="text-xs text-muted-foreground">{article.description}</p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {filteredArticles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Book className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No articles found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
