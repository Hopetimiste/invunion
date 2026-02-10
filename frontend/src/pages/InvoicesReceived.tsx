import { useState, useEffect } from "react";
import { getInvoices, Invoice, InvoicesParams, InvoiceStatus } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, FileInput, Upload, RefreshCw, Search, Filter, ChevronLeft, ChevronRight, Plus, Download } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

const statusColors: Record<InvoiceStatus, string> = {
  unpaid: "bg-yellow-100 text-yellow-800",
  partial: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-800",
  overdue: "bg-red-100 text-red-800",
};

const statusLabels: Record<InvoiceStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  cancelled: "Cancelled",
  overdue: "Overdue",
};

export default function InvoicesReceived() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  const fetchInvoices = async (params?: InvoicesParams) => {
    setError("");
    setLoading(true);

    try {
      const response = await getInvoices({
        page,
        pageSize,
        type: "received", // Only received invoices
        ...params,
      });
      setInvoices(response.items);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les factures. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params: InvoicesParams = { page, pageSize, type: "received" };
    if (startDate) params.startDate = format(startDate, "yyyy-MM-dd");
    if (endDate) params.endDate = format(endDate, "yyyy-MM-dd");
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (statusFilter !== "all") params.status = statusFilter;
    
    fetchInvoices(params);
  }, [page]);

  const handleApplyFilters = () => {
    setPage(1);
    const params: InvoicesParams = { page: 1, pageSize, type: "received" };
    if (startDate) params.startDate = format(startDate, "yyyy-MM-dd");
    if (endDate) params.endDate = format(endDate, "yyyy-MM-dd");
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (statusFilter !== "all") params.status = statusFilter;
    fetchInvoices(params);
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchQuery("");
    setStatusFilter("all");
    setPage(1);
    fetchInvoices({ page: 1, pageSize, type: "received" });
  };

  const formatCurrency = (amount: string | number, currency: string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "EUR",
    }).format(numAmount);
  };

  // Split invoices into two groups
  const notFullyRecoveredInvoices = invoices.filter(inv => parseFloat(inv.recovery_percent) < 100);
  const fullyRecoveredInvoices = invoices.filter(inv => parseFloat(inv.recovery_percent) >= 100);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invoices Issued</h1>
            <p className="text-muted-foreground">
              {total} invoice{total !== 1 ? "s" : ""} issued
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" disabled={loading}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
            <Button variant="outline" disabled={loading || invoices.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchInvoices({ page, pageSize, type: "received" })}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[160px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MM/dd/yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[160px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MM/dd/yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as InvoiceStatus | "all")}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label>Search</Label>
                <Input
                  placeholder="Invoice #, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleApplyFilters} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="ghost" onClick={handleClearFilters} disabled={loading}>
                  Clear
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : invoices.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="p-0">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileInput className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No invoices issued</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  Import invoices you've sent to customers to track and manage payments.
                </p>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Section 1: Not Fully Recovered */}
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Not Fully Recovered ({notFullyRecoveredInvoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {notFullyRecoveredInvoices.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    All invoices are fully recovered
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Recovery</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount (incl. VAT)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notFullyRecoveredInvoices.map((invoice) => {
                        const recoveryPercent = parseFloat(invoice.recovery_percent);
                        return (
                          <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                            <TableCell className="font-medium">
                              {invoice.invoice_number || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="truncate max-w-[200px]" title={invoice.recipient_name || "-"}>
                                {invoice.recipient_name || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {invoice.invoice_date 
                                ? format(new Date(invoice.invoice_date), "MM/dd/yyyy")
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              {invoice.due_date 
                                ? format(new Date(invoice.due_date), "MM/dd/yyyy")
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={recoveryPercent} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {recoveryPercent.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("font-normal", statusColors[invoice.status])}>
                                {statusLabels[invoice.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatCurrency(invoice.amount_incl_vat, invoice.currency)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Section 2: Fully Recovered */}
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Fully Recovered ({fullyRecoveredInvoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {fullyRecoveredInvoices.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    No fully recovered invoices yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Recovery</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount (incl. VAT)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fullyRecoveredInvoices.map((invoice) => {
                        const recoveryPercent = parseFloat(invoice.recovery_percent);
                        return (
                          <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                            <TableCell className="font-medium">
                              {invoice.invoice_number || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="truncate max-w-[200px]" title={invoice.recipient_name || "-"}>
                                {invoice.recipient_name || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {invoice.invoice_date 
                                ? format(new Date(invoice.invoice_date), "MM/dd/yyyy")
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              {invoice.due_date 
                                ? format(new Date(invoice.due_date), "MM/dd/yyyy")
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={recoveryPercent} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {recoveryPercent.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("font-normal", statusColors[invoice.status])}>
                                {statusLabels[invoice.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatCurrency(invoice.amount_incl_vat, invoice.currency)}
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
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / pageSize)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
