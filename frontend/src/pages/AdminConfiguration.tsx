import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Users, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { updateProfile, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential, Auth } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const nameSchema = z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters");
const emailSchema = z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters");

export default function AdminConfiguration() {
  const { user } = useAuth();
  const [auth, setAuth] = useState<Auth | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const firebaseAuth = await getFirebaseAuth();
        setAuth(firebaseAuth);
      } catch (err) {
        console.error("Failed to initialize Firebase Auth:", err);
      }
    };
    initAuth();
  }, []);

  const handleUpdateName = async () => {
    const result = nameSchema.safeParse(displayName);
    if (!result.success) {
      toast({ title: "Validation Error", description: result.error.errors[0].message, variant: "destructive" });
      return;
    }

    if (!auth?.currentUser) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }

    setIsUpdatingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: result.data });
      toast({ title: "Success", description: "Display name updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update name", variant: "destructive" });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateEmail = async () => {
    const emailResult = emailSchema.safeParse(newEmail);
    if (!emailResult.success) {
      toast({ title: "Validation Error", description: emailResult.error.errors[0].message, variant: "destructive" });
      return;
    }

    if (!currentPassword.trim()) {
      toast({ title: "Validation Error", description: "Current password is required to change email", variant: "destructive" });
      return;
    }

    if (!auth?.currentUser || !auth.currentUser.email) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      // Re-authenticate user before email change
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Send verification to new email
      await verifyBeforeUpdateEmail(auth.currentUser, emailResult.data);
      
      toast({ 
        title: "Verification Email Sent", 
        description: "Please check your new email and click the verification link to complete the change." 
      });
      setShowEmailForm(false);
      setCurrentPassword("");
    } catch (error: any) {
      let message = error.message || "Failed to update email";
      if (error.code === "auth/wrong-password") {
        message = "Incorrect password. Please try again.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please try again later.";
      } else if (error.code === "auth/requires-recent-login") {
        message = "Please log out and log back in before changing your email.";
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <AppLayout showAdminNav>
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuration</h1>
            <p className="text-muted-foreground">Manage system settings and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">My Profile</span>
              </TabsTrigger>
              <TabsTrigger value="language" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Language</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6 space-y-6">
              {/* Display Name Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Display Name</CardTitle>
                  <CardDescription>Update your display name</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your name"
                      maxLength={100}
                    />
                  </div>
                  <Button onClick={handleUpdateName} disabled={isUpdatingName}>
                    {isUpdatingName ? "Updating..." : "Update Name"}
                  </Button>
                </CardContent>
              </Card>

              {/* Email Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Address</CardTitle>
                  <CardDescription>
                    Your current email: <span className="font-medium text-foreground">{user?.email}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showEmailForm ? (
                    <Button variant="outline" onClick={() => setShowEmailForm(true)}>
                      Change Email Address
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="newEmail">New Email Address</Label>
                        <Input
                          id="newEmail"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="Enter new email"
                          maxLength={255}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                        />
                        <p className="text-sm text-muted-foreground">
                          For security, we need to verify your identity before changing your email.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleUpdateEmail} disabled={isUpdatingEmail}>
                          {isUpdatingEmail ? "Sending..." : "Send Verification Email"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowEmailForm(false);
                            setCurrentPassword("");
                            setNewEmail(user?.email || "");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        A verification link will be sent to your new email address. Click the link to complete the change.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="language" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Language Settings</CardTitle>
                  <CardDescription>Configure language and localization preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Language settings will be available here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Users Management</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">User management options will be available here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Configure account-level settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Account settings will be available here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
