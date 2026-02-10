import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { User, UserPermissions, defaultPermissions, allPermissionsEnabled } from "@/types/permissions";
import { PermissionsEditor } from "./PermissionsEditor";

// Mock data - replace with Firestore data later
const mockUsers: User[] = [
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    isAdmin: true,
    permissions: allPermissionsEnabled,
  },
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    isAdmin: false,
    permissions: {
      dashboard: { view: true },
      moneyTransaction: { view: true, upload: true, addManually: false, download: true, manage: false },
      cryptoTransaction: { view: true, upload: false, download: true, manage: false },
      invoicesReceipts: { view: true, upload: true, addManually: false, manage: false, download: true },
      accountConfiguration: { view: true, edit: false },
      technicalConfiguration: { view: false, edit: false },
    },
  },
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Invite user state
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<UserPermissions>(defaultPermissions);
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user });
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!editingUser) return;

    setUsers(users.map((u) => (u.id === editingUser.id ? editingUser : u)));
    setIsEditDialogOpen(false);
    setEditingUser(null);
    toast({ title: "Success", description: "User updated successfully" });
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;

    setUsers(users.filter((u) => u.id !== userToDelete.id));
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
    toast({ title: "Success", description: "User deleted successfully" });
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return;
    }

    // Check if email already exists
    if (users.some((u) => u.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast({ title: "Error", description: "User with this email already exists", variant: "destructive" });
      return;
    }

    setIsInviting(true);
    try {
      // TODO: Send invitation via backend
      const newUser: User = {
        id: Date.now().toString(),
        firstName: inviteFirstName,
        lastName: inviteLastName,
        email: inviteEmail,
        isAdmin: inviteIsAdmin,
        permissions: invitePermissions,
      };
      setUsers([...users, newUser]);
      setIsInviteDialogOpen(false);
      setInviteFirstName("");
      setInviteLastName("");
      setInviteEmail("");
      setInvitePermissions(defaultPermissions);
      setInviteIsAdmin(false);
      toast({ title: "Success", description: `Invitation sent to ${inviteEmail}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to send invitation", variant: "destructive" });
    } finally {
      setIsInviting(false);
    }
  };

  const getPermissionSummary = (user: User): string => {
    if (user.isAdmin) return "Administrator";
    
    const hasAll = Object.values(user.permissions).every((module) =>
      Object.values(module).every((v) => v === true)
    );
    if (hasAll) return "Full Access";

    const hasNone = Object.values(user.permissions).every((module) =>
      Object.values(module).every((v) => v === false)
    );
    if (hasNone) return "No Access";

    return "Custom";
  };

  const getPermissionBadgeColor = (summary: string) => {
    switch (summary) {
      case "Administrator":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "Full Access":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "No Access":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage users and access rights</CardDescription>
          </div>
          <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const summary = getPermissionSummary(user);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.firstName || "-"}</TableCell>
                    <TableCell>{user.lastName || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPermissionBadgeColor(summary)}`}
                      >
                        {summary}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(user)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user and configure their permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inviteFirstName">First Name</Label>
                <Input
                  id="inviteFirstName"
                  placeholder="John"
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteLastName">Last Name</Label>
                <Input
                  id="inviteLastName"
                  placeholder="Doe"
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">Permissions</Label>
              <PermissionsEditor
                permissions={invitePermissions}
                onChange={setInvitePermissions}
                isAdmin={inviteIsAdmin}
                onAdminChange={setInviteIsAdmin}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUser} disabled={isInviting}>
              {isInviting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input
                    id="editFirstName"
                    value={editingUser.firstName}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input
                    id="editLastName"
                    value={editingUser.lastName}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">Permissions</Label>
                <PermissionsEditor
                  permissions={editingUser.permissions}
                  onChange={(permissions) =>
                    setEditingUser({ ...editingUser, permissions })
                  }
                  isAdmin={editingUser.isAdmin}
                  onAdminChange={(isAdmin) =>
                    setEditingUser({ ...editingUser, isAdmin })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {userToDelete?.firstName} {userToDelete?.lastName}
              {userToDelete?.firstName || userToDelete?.lastName ? "" : userToDelete?.email}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
