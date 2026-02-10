import { useState, useEffect } from "react";
import { getTransactions, Transaction, TransactionsParams, TransactionStatus, PaymentMethod, PaymentContext } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, CreditCard, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, Upload, Plus, Download } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const statusColors: Record<TransactionStatus, string> = {
  unconsidered: "bg-gray-100 text-gray-800",
  unmatched: "bg-yellow-100 text-yellow-800",
  matched: "bg-green-100 text-green-800",
  ignored: "bg-slate-100 text-slate-800",
  pending: "bg-blue-100 text-blue-800",
};

const statusLabels: Record<TransactionStatus, string> = {
  unconsidered: "À traiter",
  unmatched: "Non rapproché",
  matched: "Rapproché",
  ignored: "Ignoré",
  pending: "En attente",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: "Carte",
  transfer: "Virement",
  direct_debit: "Prélèvement",
  cash: "Espèces",
  check: "Chèque",
  crypto: "Crypto",
  other: "Autre",
};

const paymentContextLabels: Record<PaymentContext, string> = {
  CIT: "CIT",
  MIT: "MIT",
  recurring: "Récurrent",
  one_time: "Ponctuel",
  refund: "Remboursement",
  other: "Autre",
};

const sourceTypeLabels: Record<string, string> = {
  tink: "Tink",
  csv: "CSV",
  api: "API",
  manual: "Manuel",
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all");
  
  // Advanced Filters
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | "all">("all");
  const [paymentContextFilter, setPaymentContextFilter] = useState<PaymentContext | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [counterpartyFilter, setCounterpartyFilter] = useState("");
  const [externalRefFilter, setExternalRefFilter] = useState("");

  const buildParams = (pageNum: number): TransactionsParams => {
    const params: TransactionsParams = { page: pageNum, pageSize };
    if (startDate) params.startDate = format(startDate, "yyyy-MM-dd");
    if (endDate) params.endDate = format(endDate, "yyyy-MM-dd");
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (statusFilter !== "all") params.status = statusFilter;
    if (paymentMethodFilter !== "all") params.paymentMethod = paymentMethodFilter;
    if (paymentContextFilter !== "all") params.paymentContext = paymentContextFilter;
    if (externalRefFilter.trim()) params.externalReference = externalRefFilter.trim();
    // Note: sourceType, category, counterparty filtering may need API support
    // For now, search covers general text matching
    return params;
  };

  const fetchTransactions = async (params?: TransactionsParams) => {
    setError("");
    setLoading(true);

    try {
      const response = await getTransactions(params || buildParams(page));
      setTransactions(response.items);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les transactions. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(buildParams(page));
  }, [page]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchTransactions(buildParams(1));
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchQuery("");
    setStatusFilter("all");
    setSourceTypeFilter("all");
    setPaymentMethodFilter("all");
    setPaymentContextFilter("all");
    setCategoryFilter("");
    setCounterpartyFilter("");
    setExternalRefFilter("");
    setPage(1);
    fetchTransactions({ page: 1, pageSize });
  };

  const activeFiltersCount = [
    startDate,
    endDate,
    searchQuery.trim(),
    statusFilter !== "all" ? statusFilter : null,
    sourceTypeFilter !== "all" ? sourceTypeFilter : null,
    paymentMethodFilter !== "all" ? paymentMethodFilter : null,
    paymentContextFilter !== "all" ? paymentContextFilter : null,
    categoryFilter.trim(),
    counterpartyFilter.trim(),
    externalRefFilter.trim(),
  ].filter(Boolean).length;

  const formatCurrency = (amount: string | number, currency: string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency || "EUR",
    }).format(numAmount);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">
              {total} transaction{total !== 1 ? "s" : ""} total
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
            <Button variant="outline" disabled={loading || transactions.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchTransactions(buildParams(page))}
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
                  <Label>Date début</Label>
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
                        {startDate ? format(startDate, "dd/MM/yyyy") : "Sélectionner"}
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
                  <Label>Date fin</Label>
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
                        {endDate ? format(endDate, "dd/MM/yyyy") : "Sélectionner"}
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
                  <Label>Statut</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as TransactionStatus | "all")}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="unconsidered">À traiter</SelectItem>
                      <SelectItem value="unmatched">Non rapproché</SelectItem>
                      <SelectItem value="matched">Rapproché</SelectItem>
                      <SelectItem value="ignored">Ignoré</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label>Recherche</Label>
                  <Input
                    placeholder="Description, contrepartie, IBAN..."
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
                      <Label>Source</Label>
                      <Select
                        value={sourceTypeFilter}
                        onValueChange={setSourceTypeFilter}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Toutes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="tink">Tink</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="api">API</SelectItem>
                          <SelectItem value="manual">Manuel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Mode de paiement</Label>
                      <Select
                        value={paymentMethodFilter}
                        onValueChange={(value) => setPaymentMethodFilter(value as PaymentMethod | "all")}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="card">Carte</SelectItem>
                          <SelectItem value="transfer">Virement</SelectItem>
                          <SelectItem value="direct_debit">Prélèvement</SelectItem>
                          <SelectItem value="cash">Espèces</SelectItem>
                          <SelectItem value="check">Chèque</SelectItem>
                          <SelectItem value="crypto">Crypto</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Contexte</Label>
                      <Select
                        value={paymentContextFilter}
                        onValueChange={(value) => setPaymentContextFilter(value as PaymentContext | "all")}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="CIT">CIT</SelectItem>
                          <SelectItem value="MIT">MIT</SelectItem>
                          <SelectItem value="recurring">Récurrent</SelectItem>
                          <SelectItem value="one_time">Ponctuel</SelectItem>
                          <SelectItem value="refund">Remboursement</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Catégorie</Label>
                      <Input
                        placeholder="Ex: Salaires"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-[150px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Contrepartie</Label>
                      <Input
                        placeholder="Nom ou IBAN"
                        value={counterpartyFilter}
                        onChange={(e) => setCounterpartyFilter(e.target.value)}
                        className="w-[180px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Réf. externe</Label>
                      <Input
                        placeholder="Référence"
                        value={externalRefFilter}
                        onChange={(e) => setExternalRefFilter(e.target.value)}
                        className="w-[150px]"
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
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Aucune transaction</h3>
                <p className="text-muted-foreground max-w-sm">
                  {activeFiltersCount > 0 
                    ? "Aucune transaction ne correspond à vos critères de recherche."
                    : "Connectez votre compte bancaire ou importez des transactions pour commencer."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Contrepartie</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Méthode</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(tx.transaction_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            <div className="truncate" title={tx.description_display || tx.description_original || "-"}>
                              {tx.description_display || tx.description_original || "-"}
                            </div>
                            {tx.external_reference && (
                              <div className="text-xs text-muted-foreground truncate">
                                Réf: {tx.external_reference}
                              </div>
                            )}
                            {tx.category && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {tx.category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <div className="truncate text-foreground" title={tx.counterparty_name || "-"}>
                              {tx.counterparty_name || "-"}
                            </div>
                            {tx.counterparty_iban && (
                              <div className="text-xs text-muted-foreground truncate" title={tx.counterparty_iban}>
                                {tx.counterparty_iban}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {sourceTypeLabels[tx.source_type] || tx.source_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tx.payment_method ? (
                              <span className="text-sm text-muted-foreground">
                                {paymentMethodLabels[tx.payment_method] || tx.payment_method}
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
                            {formatCurrency(tx.amount, tx.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {page} sur {Math.ceil(total / pageSize) || 1}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!hasMore || loading}
                    >
                      Suivant
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
