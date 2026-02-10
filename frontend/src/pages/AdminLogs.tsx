import { useState, useEffect } from "react";
import { getAdminLogs, AdminLog, AdminLogsParams } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Loader2, AlertCircle, FileText, RefreshCw, Search, Copy, Eye, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;

export default function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const { toast } = useToast();

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchLogs = async (pageNum: number = 1, pageToken?: string) => {
    setError("");
    setLoading(true);

    try {
      const params: AdminLogsParams = {
        limit: PAGE_SIZE,
      };
      if (pageToken) params.pageToken = pageToken;
      if (severityFilter) params.severity = severityFilter;
      if (searchText) params.q = searchText;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const data = await getAdminLogs(params);
      setLogs(data?.logs || []);
      setNextPageToken(data?.nextPageToken || null);
      setHasNextPage(!!data?.nextPageToken);
      setTotalPages(pageNum + (data?.nextPageToken ? 1 : 0));
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || "Unable to load logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const handleSearch = () => {
    fetchLogs(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > page && nextPageToken) {
      fetchLogs(newPage, nextPageToken);
    } else if (newPage < page) {
      // Going back requires refetching from the start
      fetchLogs(1);
    }
  };

  const getLevelBadgeVariant = (logLevel: string) => {
    switch (logLevel?.toLowerCase()) {
      case "error":
        return "destructive";
      case "warn":
      case "warning":
        return "secondary";
      case "info":
      default:
        return "outline";
    }
  };

  const getLogMessage = (log: AdminLog): string => {
    if (log.textPayload) return log.textPayload;
    if (log.jsonPayload) return JSON.stringify(log.jsonPayload);
    return "";
  };

  const formatMessage = (message: string): string => {
    try {
      const parsed = JSON.parse(message);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return message;
    }
  };

  const isJsonMessage = (message: string): boolean => {
    try {
      JSON.parse(message);
      return true;
    } catch {
      return false;
    }
  };

  const copyLogToClipboard = async (log: AdminLog) => {
    const message = getLogMessage(log);
    const logText = `Timestamp: ${log.timestamp}
Severity: ${log.severity}
Insert ID: ${log.insertId || "N/A"}
Message:
${message}`;

    try {
      await navigator.clipboard.writeText(logText);
      toast({
        title: "Copied!",
        description: "Log details copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout showAdminNav>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Logs</h1>
            <p className="text-muted-foreground">View and filter platform logs</p>
          </div>
          <Button variant="outline" onClick={() => fetchLogs(page)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Select value={severityFilter || "all"} onValueChange={(val) => setSeverityFilter(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Log Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="From Date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <Input
                type="date"
                placeholder="To Date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Search message..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={loading}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Logs Table */}
        <Card className="shadow-soft">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No logs found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or check back later.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Severity</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => {
                    const message = getLogMessage(log);
                    return (
                      <TableRow 
                        key={`${log.timestamp}-${log.insertId || index}`} 
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getLevelBadgeVariant(log.severity)}>
                            {log.severity?.toUpperCase() || "INFO"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{message}</span>
                            {isJsonMessage(message) && (
                              <Badge variant="outline" className="text-xs">JSON</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(page - 1)}
                  className={cn(page <= 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive>{page}</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(page + 1)}
                  className={cn(!hasNextPage && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        {/* Log Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Log Details</span>
                {selectedLog && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLogToClipboard(selectedLog)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                )}
              </DialogTitle>
              <DialogDescription>
                Complete log information for debugging
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4 mt-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <p className="font-mono text-sm mt-1">{format(new Date(selectedLog.timestamp), "yyyy-MM-dd HH:mm:ss.SSS")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Severity</label>
                    <div className="mt-1">
                      <Badge variant={getLevelBadgeVariant(selectedLog.severity)}>
                        {selectedLog.severity?.toUpperCase() || "INFO"}
                      </Badge>
                    </div>
                  </div>
                  {selectedLog.insertId && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Insert ID</label>
                      <p className="font-mono text-sm mt-1 break-all">{selectedLog.insertId}</p>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Message {isJsonMessage(getLogMessage(selectedLog)) && <Badge variant="outline" className="ml-2">JSON</Badge>}
                  </label>
                  <div className="mt-2 p-4 bg-muted rounded-md border">
                    <pre className="text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                      {formatMessage(getLogMessage(selectedLog))}
                    </pre>
                  </div>
                </div>

                {/* Raw JSON */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Raw Data</label>
                  <div className="mt-2 p-4 bg-muted rounded-md border">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words overflow-x-auto">
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
