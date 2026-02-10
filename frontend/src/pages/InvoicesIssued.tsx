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
import { Loader2, AlertCircle, FileText, Plus, RefreshCw, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
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
  unpaid: "Non payée",
  partial: "Partielle",
  paid: "Payée",
  cancelled: "Annulée",
  overdue: "En retard",
};

export default function InvoicesIssued() {
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
        type: "issued", // Only issued invoices
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
    const params: InvoicesParams = { page, pageSize, type: "issued" };
    if (startDate) params.startDate = format(startDate, "yyyy-MM-dd");
    if (endDate) params.endDate = format(endDate, "yyyy-MM-dd");
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (statusFilter !== "all") params.status = statusFilter;
    
    fetchInvoices(params);
  }, [page]);

  const handleApplyFilters = () => {
    setPage(1);
    const params: InvoicesParams = { page: 1, pageSize, type: "issued" };
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
    fetchInvoices({ page: 1, pageSize, type: "issued" });
  };

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
            <h1 className="text-2xl font-bold text-foreground">Factures émises</h1>
            <p className="text-muted-foreground">
              {total} facture{total !== 1 ? "s" : ""} émise{total !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fetchInvoices({ page, pageSize, type: "issued" })}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Actualiser
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle facture
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  onValueChange={(value) => setStatusFilter(value as InvoiceStatus | "all")}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="unpaid">Non payée</SelectItem>
                    <SelectItem value="partial">Partielle</SelectItem>
                    <SelectItem value="paid">Payée</SelectItem>
                    <SelectItem value="overdue">En retard</SelectItem>
                    <SelectItem value="cancelled">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label>Recherche</Label>
                <Input
                  placeholder="N° facture, client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleApplyFilters} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Filtrer
                </Button>
                <Button variant="ghost" onClick={handleClearFilters} disabled={loading}>
                  Effacer
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

        {/* Invoices Table */}
        <Card className="shadow-soft">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Aucune facture émise</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  Créez votre première facture pour commencer à suivre vos paiements clients.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une facture
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Facture</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Recouvrement</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Montant TTC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const recoveryPercent = parseFloat(invoice.recovery_percent);
                      return (
                        <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <TableCell className="font-medium">
                            {invoice.invoice_number || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="truncate max-w-[200px]" title={invoice.recipient_name || invoice.customer_name || "-"}>
                              {invoice.recipient_name || invoice.customer_name || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {invoice.invoice_date 
                              ? format(new Date(invoice.invoice_date), "dd/MM/yyyy")
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            {invoice.due_date 
                              ? format(new Date(invoice.due_date), "dd/MM/yyyy")
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

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {page} sur {Math.ceil(total / pageSize)}
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
