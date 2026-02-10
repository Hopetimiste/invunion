import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, MessageSquare, Book, Clock, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: "open" | "pending" | "resolved";
  createdAt: string;
  lastUpdate: string;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
}

const mockTickets: Ticket[] = [
  {
    id: "TKT-001",
    subject: "Unable to connect bank account",
    category: "Technical",
    priority: "high",
    status: "open",
    createdAt: "2024-01-15",
    lastUpdate: "2024-01-16",
  },
  {
    id: "TKT-002",
    subject: "Invoice export not working",
    category: "Technical",
    priority: "medium",
    status: "pending",
    createdAt: "2024-01-10",
    lastUpdate: "2024-01-14",
  },
  {
    id: "TKT-003",
    subject: "Billing question",
    category: "Billing",
    priority: "low",
    status: "resolved",
    createdAt: "2024-01-05",
    lastUpdate: "2024-01-08",
  },
];

const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: "1",
    title: "Getting Started with Invunion",
    category: "Getting Started",
    excerpt: "Learn how to set up your account and start managing your finances.",
  },
  {
    id: "2",
    title: "Connecting Your Bank Account",
    category: "Getting Started",
    excerpt: "Step-by-step guide to linking your bank accounts securely.",
  },
  {
    id: "3",
    title: "Understanding Transaction Categories",
    category: "Transactions",
    excerpt: "How to categorize and organize your transactions effectively.",
  },
  {
    id: "4",
    title: "Creating and Managing Invoices",
    category: "Invoices",
    excerpt: "Complete guide to invoice creation, sending, and tracking.",
  },
  {
    id: "5",
    title: "API Integration Guide",
    category: "Technical & API",
    excerpt: "How to integrate Invunion with your existing systems using our API.",
  },
  {
    id: "6",
    title: "Webhook Configuration",
    category: "Technical & API",
    excerpt: "Set up webhooks to receive real-time notifications about events.",
  },
  {
    id: "7",
    title: "Managing Team Members",
    category: "Account Management",
    excerpt: "Add, remove, and manage permissions for your team members.",
  },
  {
    id: "8",
    title: "Security Best Practices",
    category: "Security",
    excerpt: "Tips and recommendations for keeping your account secure.",
  },
];

const categories = ["Getting Started", "Transactions", "Invoices", "Technical & API", "Account Management", "Security"];

export default function Support() {
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketPriority, setTicketPriority] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKBCategory, setSelectedKBCategory] = useState<string | null>(null);

  const handleSubmitTicket = () => {
    if (!ticketSubject || !ticketDescription || !ticketCategory || !ticketPriority) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Support ticket submitted successfully");
    setTicketSubject("");
    setTicketDescription("");
    setTicketCategory("");
    setTicketPriority("");
  };

  const getStatusBadge = (status: Ticket["status"]) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">Open</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">Pending</Badge>;
      case "resolved":
        return <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Resolved</Badge>;
    }
  };

  const filteredArticles = knowledgeArticles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedKBCategory || article.category === selectedKBCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground">Get help with your account or browse our knowledge base</p>
        </div>

        <Tabs defaultValue="ticket" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="ticket" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Submit Ticket
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              My Tickets
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              Knowledge Base
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ticket" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit a Support Ticket</CardTitle>
                <CardDescription>
                  Describe your issue and our team will get back to you as soon as possible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={ticketCategory} onValueChange={setTicketCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="account">Account</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority *</Label>
                    <Select value={ticketPriority} onValueChange={setTicketPriority}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Please provide as much detail as possible..."
                    className="min-h-[150px]"
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {ticketDescription.length}/2000 characters
                  </p>
                </div>
                <Button onClick={handleSubmitTicket} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Ticket
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>My Tickets</CardTitle>
                <CardDescription>View and track your support tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{ticket.subject}</span>
                          {getStatusBadge(ticket.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{ticket.id}</span>
                          <span>•</span>
                          <span>{ticket.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ticket.lastUpdate}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
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

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedKBCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedKBCategory(null)}
                  >
                    All
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedKBCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedKBCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredArticles.map((article) => (
                      <div
                        key={article.id}
                        className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium text-foreground">{article.title}</h4>
                            <p className="text-sm text-muted-foreground">{article.excerpt}</p>
                            <Badge variant="outline" className="mt-2">
                              {article.category}
                            </Badge>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                    {filteredArticles.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No articles found matching your search.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
