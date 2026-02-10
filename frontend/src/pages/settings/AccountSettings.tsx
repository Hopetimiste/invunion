import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Bell, Mail, CreditCard, Check, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { UserManagement } from "@/components/settings/UserManagement";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Mock subscription data
const currentSubscription = {
  plan: "Business Pro",
  price: "€99/month",
  status: "Active",
  nextBillingDate: "February 15, 2026",
  features: [
    "Unlimited transactions",
    "Up to 10 users",
    "Priority support",
    "Advanced analytics",
    "API access"
  ]
};

// Mock invoice history
const invoiceHistory = [
  { id: "INV-2026-001", date: "January 15, 2026", amount: "€99.00", status: "Paid" },
  { id: "INV-2025-012", date: "December 15, 2025", amount: "€99.00", status: "Paid" },
  { id: "INV-2025-011", date: "November 15, 2025", amount: "€99.00", status: "Paid" },
  { id: "INV-2025-010", date: "October 15, 2025", amount: "€99.00", status: "Paid" },
  { id: "INV-2025-009", date: "September 15, 2025", amount: "€99.00", status: "Paid" },
];

export default function AccountSettings() {
  const { companyName } = useAuth();
  const { t } = useLanguage();
  const [organizationName, setOrganizationName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Contact information state
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Initialize with company name from registration
  useEffect(() => {
    if (companyName) {
      setOrganizationName(companyName);
      setEntityName(companyName);
    }
  }, [companyName]);

  const handleSaveNames = async () => {
    if (!organizationName.trim()) {
      toast({ title: "Error", description: "Organization name is required", variant: "destructive" });
      return;
    }
    if (!entityName.trim()) {
      toast({ title: "Error", description: "Entity name is required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Save to Firestore when backend is ready
      toast({ title: "Success", description: "Names updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update names", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("settings.account")}</h1>
          <p className="text-muted-foreground mt-2">{t("settings.accountDescription")}</p>
        </div>

        <Tabs defaultValue="name" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="name" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.name")}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.users")}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.notifications")}</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.contact")}</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.billing")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="name" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.organizationEntity")}</CardTitle>
                <CardDescription>
                  {t("settings.organizationEntityDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">{t("settings.organizationName")}</Label>
                  <Input
                    id="organizationName"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder=""
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entityName">{t("settings.entityName")}</Label>
                  <Input
                    id="entityName"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder=""
                    maxLength={100}
                  />
                </div>

                <Button onClick={handleSaveNames} disabled={isSaving}>
                  {isSaving ? t("common.saving") : t("common.saveChanges")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.notificationFrequency")}</CardTitle>
                <CardDescription>{t("settings.notifications")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Address</CardTitle>
                  <CardDescription>Your company's official address and registration details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Business Street"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="12345"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="United States"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vatNumber">VAT Number</Label>
                      <Input
                        id="vatNumber"
                        value={vatNumber}
                        onChange={(e) => setVatNumber(e.target.value)}
                        placeholder="VAT123456789"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyId">Company ID</Label>
                      <Input
                        id="companyId"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        placeholder="Company registration number"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={async () => {
                      setIsSavingAddress(true);
                      try {
                        // TODO: Save to backend when ready
                        toast({ title: "Success", description: "Company address saved successfully" });
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to save company address", variant: "destructive" });
                      } finally {
                        setIsSavingAddress(false);
                      }
                    }} 
                    disabled={isSavingAddress}
                  >
                    {isSavingAddress ? "Saving..." : "Save Company Address"}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Main Contact</CardTitle>
                  <CardDescription>Primary contact information for your company</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="contact@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Phone Number</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={async () => {
                      setIsSavingContact(true);
                      try {
                        // TODO: Save to backend when ready
                        toast({ title: "Success", description: "Contact information saved successfully" });
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to save contact information", variant: "destructive" });
                      } finally {
                        setIsSavingContact(false);
                      }
                    }} 
                    disabled={isSavingContact}
                  >
                    {isSavingContact ? "Saving..." : "Save Contact Information"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Subscription</CardTitle>
                  <CardDescription>Your active Invunion subscription plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{currentSubscription.plan}</h3>
                      <p className="text-muted-foreground">{currentSubscription.price}</p>
                    </div>
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      {currentSubscription.status}
                    </Badge>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Next billing date: <span className="font-medium text-foreground">{currentSubscription.nextBillingDate}</span>
                    </p>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Plan features:</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentSubscription.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="outline">Change Plan</Button>
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                      Cancel Subscription
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Invoice History</CardTitle>
                  <CardDescription>View and download your past invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceHistory.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.id}</TableCell>
                          <TableCell>{invoice.date}</TableCell>
                          <TableCell>{invoice.amount}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
