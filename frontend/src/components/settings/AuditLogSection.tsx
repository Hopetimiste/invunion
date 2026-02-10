import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Filter, User, FileText, Link2, CreditCard, Settings, Building } from "lucide-react";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: {
    name: string;
    email: string;
  };
  action: string;
  category: string;
  details: string;
  ipAddress: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "transaction":
      return <CreditCard className="h-4 w-4" />;
    case "invoice":
      return <FileText className="h-4 w-4" />;
    case "user":
      return <User className="h-4 w-4" />;
    case "settings":
      return <Settings className="h-4 w-4" />;
    case "connection":
      return <Link2 className="h-4 w-4" />;
    case "tenant":
      return <Building className="h-4 w-4" />;
    default:
      return <ScrollText className="h-4 w-4" />;
  }
};

const getCategoryBadge = (category: string) => {
  const icon = getCategoryIcon(category);
  return (
    <Badge variant="outline" className="flex items-center gap-1 capitalize">
      {icon}
      {category}
    </Badge>
  );
};

export function AuditLogSection() {
  const [auditLogs] = useState<AuditLogEntry[]>([
    {
      id: "log_001",
      timestamp: "2025-01-28 15:42:18",
      user: { name: "John Doe", email: "john@example.com" },
      action: "Created transaction",
      category: "transaction",
      details: "Added manual transaction #TXN-2025-0042 for €1,250.00",
      ipAddress: "192.168.1.100",
    },
    {
      id: "log_002",
      timestamp: "2025-01-28 14:30:05",
      user: { name: "Jane Smith", email: "jane@example.com" },
      action: "Linked invoice to transaction",
      category: "invoice",
      details: "Linked invoice #INV-2025-0018 to transaction #TXN-2025-0039",
      ipAddress: "192.168.1.101",
    },
    {
      id: "log_003",
      timestamp: "2025-01-28 13:15:22",
      user: { name: "John Doe", email: "john@example.com" },
      action: "Updated invoice",
      category: "invoice",
      details: "Changed status of invoice #INV-2025-0015 from 'pending' to 'paid'",
      ipAddress: "192.168.1.100",
    },
    {
      id: "log_004",
      timestamp: "2025-01-28 11:45:00",
      user: { name: "Admin User", email: "admin@example.com" },
      action: "Updated user permissions",
      category: "user",
      details: "Granted 'edit_transactions' permission to jane@example.com",
      ipAddress: "192.168.1.1",
    },
    {
      id: "log_005",
      timestamp: "2025-01-28 10:30:15",
      user: { name: "Jane Smith", email: "jane@example.com" },
      action: "Connected bank account",
      category: "connection",
      details: "Connected Revolut Business account ending in ****4521",
      ipAddress: "192.168.1.101",
    },
    {
      id: "log_006",
      timestamp: "2025-01-28 09:15:42",
      user: { name: "John Doe", email: "john@example.com" },
      action: "Deleted transaction",
      category: "transaction",
      details: "Deleted duplicate transaction #TXN-2025-0038",
      ipAddress: "192.168.1.100",
    },
    {
      id: "log_007",
      timestamp: "2025-01-27 17:20:00",
      user: { name: "Admin User", email: "admin@example.com" },
      action: "Updated company settings",
      category: "settings",
      details: "Changed default currency from USD to EUR",
      ipAddress: "192.168.1.1",
    },
    {
      id: "log_008",
      timestamp: "2025-01-27 14:10:33",
      user: { name: "Jane Smith", email: "jane@example.com" },
      action: "Created invoice",
      category: "invoice",
      details: "Created invoice #INV-2025-0019 for €3,500.00",
      ipAddress: "192.168.1.101",
    },
  ]);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState<string>("all");

  const filteredLogs = auditLogs.filter((log) => {
    if (categoryFilter !== "all" && log.category !== categoryFilter) return false;
    if (userFilter && !log.user.name.toLowerCase().includes(userFilter.toLowerCase()) && !log.user.email.toLowerCase().includes(userFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          Audit Log
        </CardTitle>
        <CardDescription>
          Track all user activities and changes made on the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="transaction">Transaction</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
              <SelectItem value="connection">Connection</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search user..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-[180px] h-8"
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

        {/* Logs Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {log.timestamp}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{log.user.name}</p>
                        <p className="text-xs text-muted-foreground">{log.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{getCategoryBadge(log.category)}</TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm text-muted-foreground truncate" title={log.details}>
                        {log.details}
                      </p>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {log.ipAddress}
                      </code>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
