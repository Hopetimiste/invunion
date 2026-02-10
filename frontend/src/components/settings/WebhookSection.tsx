import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Webhook, Plus, Copy, Trash2, RefreshCw, Mail, Eye, EyeOff, X, Filter } from "lucide-react";
import { toast } from "sonner";

interface WebhookEvent {
  id: string;
  status: "success" | "failed" | "pending";
  eventType: string;
  time: string;
  tries: number;
  lastFailed: string | null;
  url: string;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  eventTypes: string[];
  createdAt: string;
  isActive: boolean;
}

interface AlertEmail {
  id: string;
  email: string;
}

const EVENT_TYPES = [
  "transaction.created",
  "transaction.updated",
  "transaction.deleted",
  "invoice.created",
  "invoice.updated",
  "invoice.paid",
  "invoice.overdue",
  "user.created",
  "user.updated",
  "bank.connected",
  "bank.disconnected",
  "sync.completed",
  "sync.failed",
];

export function WebhookSection() {
  const [webhookSecret, setWebhookSecret] = useState("whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const [secretVisible, setSecretVisible] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([
    {
      id: "evt_001",
      status: "success",
      eventType: "transaction.created",
      time: "2025-01-28 14:32:15",
      tries: 1,
      lastFailed: null,
      url: "https://api.example.com/webhooks",
    },
    {
      id: "evt_002",
      status: "failed",
      eventType: "invoice.paid",
      time: "2025-01-28 13:15:42",
      tries: 3,
      lastFailed: "2025-01-28 13:45:42",
      url: "https://api.example.com/webhooks",
    },
    {
      id: "evt_003",
      status: "pending",
      eventType: "sync.completed",
      time: "2025-01-28 12:00:00",
      tries: 2,
      lastFailed: "2025-01-28 12:30:00",
      url: "https://api.example.com/webhooks",
    },
  ]);
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([
    {
      id: "1",
      url: "https://api.example.com/webhooks",
      eventTypes: ["transaction.created", "invoice.paid"],
      createdAt: "2025-01-15",
      isActive: true,
    },
  ]);
  const [alertEmails, setAlertEmails] = useState<AlertEmail[]>([
    { id: "1", email: "admin@example.com" },
  ]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventIdFilter, setEventIdFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState<string>("all");

  // Dialog states
  const [isEndpointDialogOpen, setIsEndpointDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newEndpointUrl, setNewEndpointUrl] = useState("");
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [newAlertEmail, setNewAlertEmail] = useState("");

  const generateWebhookSecret = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let secret = "whsec_";
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const handleRegenerateSecret = () => {
    const newSecret = generateWebhookSecret();
    setWebhookSecret(newSecret);
    toast.success("Webhook secret regenerated. Make sure to update your integrations.");
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(webhookSecret);
    toast.success("Webhook secret copied to clipboard");
  };

  const handleAddEndpoint = () => {
    if (!newEndpointUrl.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }
    if (selectedEventTypes.length === 0) {
      toast.error("Please select at least one event type");
      return;
    }

    const newEndpoint: WebhookEndpoint = {
      id: Date.now().toString(),
      url: newEndpointUrl,
      eventTypes: selectedEventTypes,
      createdAt: new Date().toISOString().split("T")[0],
      isActive: true,
    };

    setWebhookEndpoints([...webhookEndpoints, newEndpoint]);
    setNewEndpointUrl("");
    setSelectedEventTypes([]);
    setIsEndpointDialogOpen(false);
    toast.success("Webhook endpoint added");
  };

  const handleDeleteEndpoint = (id: string) => {
    setWebhookEndpoints(webhookEndpoints.filter((e) => e.id !== id));
    toast.success("Webhook endpoint deleted");
  };

  const handleAddAlertEmail = () => {
    if (!newAlertEmail.trim() || !newAlertEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setAlertEmails([...alertEmails, { id: Date.now().toString(), email: newAlertEmail }]);
    setNewAlertEmail("");
    setIsEmailDialogOpen(false);
    toast.success("Alert email added");
  };

  const handleDeleteAlertEmail = (id: string) => {
    setAlertEmails(alertEmails.filter((e) => e.id !== id));
    toast.success("Alert email removed");
  };

  const toggleEventType = (eventType: string) => {
    if (selectedEventTypes.includes(eventType)) {
      setSelectedEventTypes(selectedEventTypes.filter((e) => e !== eventType));
    } else {
      setSelectedEventTypes([...selectedEventTypes, eventType]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Success</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredEvents = webhookEvents.filter((event) => {
    if (statusFilter !== "all" && event.status !== statusFilter) return false;
    if (eventIdFilter && !event.id.toLowerCase().includes(eventIdFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Webhook Secret */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Secret
          </CardTitle>
          <CardDescription>
            Use this secret to verify webhook payloads from our servers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <code className="flex-1 text-sm bg-muted px-3 py-2 rounded border">
                {secretVisible ? webhookSecret : "whsec_••••••••••••••••••••••••"}
              </code>
              <Button size="icon" variant="outline" onClick={() => setSecretVisible(!secretVisible)}>
                {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="outline" onClick={handleCopySecret}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={handleRegenerateSecret}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Endpoints */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>Configure URLs to receive webhook events</CardDescription>
            </div>
            <Dialog open={isEndpointDialogOpen} onOpenChange={setIsEndpointDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Endpoint
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Webhook Endpoint</DialogTitle>
                  <DialogDescription>
                    Enter the URL where you want to receive webhook events.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Endpoint URL</Label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://your-domain.com/webhooks"
                      value={newEndpointUrl}
                      onChange={(e) => setNewEndpointUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Types</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {EVENT_TYPES.map((eventType) => (
                        <div key={eventType} className="flex items-center space-x-2">
                          <Checkbox
                            id={eventType}
                            checked={selectedEventTypes.includes(eventType)}
                            onCheckedChange={() => toggleEventType(eventType)}
                          />
                          <label
                            htmlFor={eventType}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {eventType}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEndpointDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEndpoint}>Add Endpoint</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {webhookEndpoints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No webhook endpoints configured.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhookEndpoints.map((endpoint) => (
                <div key={endpoint.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-mono text-sm">{endpoint.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {endpoint.eventTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteEndpoint(endpoint.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Emails */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Failed Webhook Alerts
              </CardTitle>
              <CardDescription>
                Get notified when webhook deliveries fail
              </CardDescription>
            </div>
            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Alert Email</DialogTitle>
                  <DialogDescription>
                    This email will receive notifications when webhook deliveries fail.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="alertEmail">Email Address</Label>
                    <Input
                      id="alertEmail"
                      type="email"
                      placeholder="alerts@your-domain.com"
                      value={newAlertEmail}
                      onChange={(e) => setNewAlertEmail(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddAlertEmail}>Add Email</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {alertEmails.length === 0 ? (
            <p className="text-muted-foreground text-sm">No alert emails configured.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {alertEmails.map((alert) => (
                <Badge key={alert.id} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  {alert.email}
                  <button
                    onClick={() => handleDeleteAlertEmail(alert.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Events */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Events</CardTitle>
          <CardDescription>View all webhook delivery attempts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Event ID"
              value={eventIdFilter}
              onChange={(e) => setEventIdFilter(e.target.value)}
              className="w-[160px] h-8"
            />
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Events Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Tries</TableHead>
                  <TableHead>Event ID</TableHead>
                  <TableHead>Last Failed</TableHead>
                  <TableHead>URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No webhook events found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{getStatusBadge(event.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.eventType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{event.time}</TableCell>
                      <TableCell>{event.tries}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{event.id}</code>
                      </TableCell>
                      <TableCell className="text-sm">
                        {event.lastFailed || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono truncate max-w-[200px] block">
                          {event.url}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
