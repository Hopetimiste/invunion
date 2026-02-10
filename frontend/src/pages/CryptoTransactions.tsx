import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, Bitcoin, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, Upload, Download } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type CryptoTransactionStatus = 'pending' | 'confirmed' | 'failed';

interface CryptoTransaction {
  id: string;
  wallet_address: string;
  transaction_hash: string;
  amount: string;
  currency: string;
  transaction_date: string;
  status: CryptoTransactionStatus;
  network: string;
  fee: string | null;
  counterparty_address: string | null;
  description: string | null;
}

const statusColors: Record<CryptoTransactionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const statusLabels: Record<CryptoTransactionStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
};

const networkLabels: Record<string, string> = {
  ethereum: "Ethereum",
  bitcoin: "Bitcoin",
  polygon: "Polygon",
  bsc: "BSC",
  arbitrum: "Arbitrum",
  other: "Other",
};

export default function CryptoTransactions() {
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Basic Filters
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CryptoTransactionStatus | "all">("all");
  
  // Advanced Filters
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [walletFilter, setWalletFilter] = useState("");

  const fetchTransactions = async () => {
    setError("");
    setLoading(true);

    try {
      // TODO: Replace with actual API call when crypto transactions endpoint is available
      // For now, simulate empty state
      await new Promise(resolve => setTimeout(resolve, 500));
      setTransactions([]);
      setTotal(0);
      setHasMore(false);
    } catch (err: any) {
      setError(err.message || "Unable to load crypto transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchTransactions();
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchQuery("");
    setStatusFilter("all");
    setNetworkFilter("all");
    setWalletFilter("");
    setPage(1);
    fetchTransactions();
  };

  const activeFiltersCount = [
    startDate,
    endDate,
    searchQuery.trim(),
    statusFilter !== "all" ? statusFilter : null,
    networkFilter !== "all" ? networkFilter : null,
    walletFilter.trim(),
  ].filter(Boolean).length;

  const formatCryptoAmount = (amount: string, currency: string) => {
    const numAmount = parseFloat(amount);
    return `${numAmount.toFixed(6)} ${currency.toUpperCase()}`;
  };

  const truncateHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Crypto Transactions</h1>
            <p className="text-muted-foreground">
              {total} transaction{total !== 1 ? "s" : ""} total
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" disabled={loading}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" disabled={loading || transactions.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchTransactions()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-soft">
          <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount} active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Filters - Always visible */}
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
                    onValueChange={(value) => setStatusFilter(value as CryptoTransactionStatus | "all")}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label>Search</Label>
                  <Input
                    placeholder="Hash, wallet, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  />
                </div>
              </div>

              {/* Advanced Filters - Collapsible */}
              <CollapsibleContent className="space-y-4">
                <div className="border-t pt-4">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Network</Label>
                      <Select
                        value={networkFilter}
                        onValueChange={setNetworkFilter}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="ethereum">Ethereum</SelectItem>
                          <SelectItem value="bitcoin">Bitcoin</SelectItem>
                          <SelectItem value="polygon">Polygon</SelectItem>
                          <SelectItem value="bsc">BSC</SelectItem>
                          <SelectItem value="arbitrum">Arbitrum</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Wallet Address</Label>
                      <Input
                        placeholder="0x..."
                        value={walletFilter}
                        onChange={(e) => setWalletFilter(e.target.value)}
                        className="w-[200px]"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <Button onClick={handleApplyFilters} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    Apply
                  </Button>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" onClick={handleClearFilters} disabled={loading}>
                      <X className="h-4 w-4 mr-2" />
                      Clear all
                    </Button>
                  )}
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {filtersExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        More filters
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardContent>
          </Collapsible>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Transactions Table */}
        <Card className="shadow-soft">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bitcoin className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No crypto transactions</h3>
                <p className="text-muted-foreground max-w-sm">
                  {activeFiltersCount > 0 
                    ? "No transactions match your search criteria."
                    : "Connect your crypto wallet or import transactions to get started."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Hash</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead>Counterparty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(tx.transaction_date), "MM/dd/yyyy")}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <span title={tx.transaction_hash}>
                              {truncateHash(tx.transaction_hash)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {networkLabels[tx.network] || tx.network}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            {tx.counterparty_address ? (
                              <span className="font-mono text-sm" title={tx.counterparty_address}>
                                {truncateHash(tx.counterparty_address)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("font-normal", statusColors[tx.status])}>
                              {statusLabels[tx.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-semibold tabular-nums whitespace-nowrap",
                            parseFloat(tx.amount) >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCryptoAmount(tx.amount, tx.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {Math.ceil(total / pageSize) || 1}
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
