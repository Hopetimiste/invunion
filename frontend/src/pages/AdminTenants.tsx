import { useState, useEffect } from "react";
import { getAdminTenants, resyncTenant, disableTenant, Tenant } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertCircle, Building2, RefreshCw, Ban, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function AdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "resync" | "disable";
    tenant: Tenant | null;
  }>({ open: false, type: "resync", tenant: null });

  const fetchTenants = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await getAdminTenants();
      setTenants(data);
    } catch (err: any) {
      setError(err.message || "Unable to load tenants. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleResync = async (tenant: Tenant) => {
    setActionLoading(tenant.id);
    setError("");

    try {
      await resyncTenant(tenant.id);
      await fetchTenants();
    } catch (err: any) {
      setError(err.message || "Unable to resync tenant. Please try again.");
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, type: "resync", tenant: null });
    }
  };

  const handleDisable = async (tenant: Tenant) => {
    setActionLoading(tenant.id);
    setError("");

    try {
      await disableTenant(tenant.id);
      await fetchTenants();
    } catch (err: any) {
      setError(err.message || "Unable to disable tenant. Please try again.");
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, type: "disable", tenant: null });
    }
  };

  return (
    <AppLayout showAdminNav>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tenant Management</h1>
            <p className="text-muted-foreground">Manage all registered companies</p>
          </div>
          <Button
            variant="outline"
            onClick={fetchTenants}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tenants Table */}
        <Card className="shadow-soft">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : tenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No tenants found</h3>
                <p className="text-muted-foreground">
                  There are no registered companies yet.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant ID</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Last Success Sync</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs">{tenant.id}</TableCell>
                      <TableCell className="font-medium">{tenant.companyName}</TableCell>
                      <TableCell className="text-muted-foreground">{tenant.country}</TableCell>
                      <TableCell>
                        <Badge
                          variant={tenant.status === "active" ? "default" : "secondary"}
                          className={cn(
                            tenant.status === "active" 
                              ? "bg-success/10 text-success hover:bg-success/20" 
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tenant.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tenant.lastSuccessSyncAt 
                          ? format(new Date(tenant.lastSuccessSyncAt), "MMM dd, yyyy HH:mm")
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actionLoading === tenant.id}
                            >
                              {actionLoading === tenant.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => window.open(`/admin/tenants/${tenant.id}`, "_blank")}
                            >
                              <Building2 className="h-4 w-4 mr-2" />
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setConfirmDialog({ open: true, type: "resync", tenant })}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resync
                            </DropdownMenuItem>
                            {tenant.status === "active" && (
                              <DropdownMenuItem
                                onClick={() => setConfirmDialog({ open: true, type: "disable", tenant })}
                                className="text-destructive focus:text-destructive"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Disable tenant
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.type === "resync" ? "Resync tenant?" : "Disable tenant?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.type === "resync" ? (
                  <>
                    This will trigger a full data sync for <strong>{confirmDialog.tenant?.companyName}</strong>. 
                    This may take a few minutes.
                  </>
                ) : (
                  <>
                    This will disable access for <strong>{confirmDialog.tenant?.companyName}</strong>. 
                    Users will no longer be able to log in or access their data.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDialog.tenant) {
                    if (confirmDialog.type === "resync") {
                      handleResync(confirmDialog.tenant);
                    } else {
                      handleDisable(confirmDialog.tenant);
                    }
                  }
                }}
                className={cn(
                  confirmDialog.type === "disable" && "bg-destructive hover:bg-destructive/90"
                )}
              >
                {confirmDialog.type === "resync" ? "Resync" : "Disable"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
