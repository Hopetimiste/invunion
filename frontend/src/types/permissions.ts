export interface ModulePermissions {
  view: boolean;
  upload?: boolean;
  addManually?: boolean;
  download?: boolean;
  manage?: boolean;
  edit?: boolean;
}

export interface UserPermissions {
  dashboard: Pick<ModulePermissions, 'view'>;
  moneyTransaction: Pick<ModulePermissions, 'view' | 'upload' | 'addManually' | 'download' | 'manage'>;
  cryptoTransaction: Pick<ModulePermissions, 'view' | 'upload' | 'download' | 'manage'>;
  invoicesReceipts: Pick<ModulePermissions, 'view' | 'upload' | 'addManually' | 'manage' | 'download'>;
  accountConfiguration: Pick<ModulePermissions, 'view' | 'edit'>;
  technicalConfiguration: Pick<ModulePermissions, 'view' | 'edit'>;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  permissions: UserPermissions;
  isAdmin?: boolean;
}

export const defaultPermissions: UserPermissions = {
  dashboard: { view: false },
  moneyTransaction: { view: false, upload: false, addManually: false, download: false, manage: false },
  cryptoTransaction: { view: false, upload: false, download: false, manage: false },
  invoicesReceipts: { view: false, upload: false, addManually: false, manage: false, download: false },
  accountConfiguration: { view: false, edit: false },
  technicalConfiguration: { view: false, edit: false },
};

export const allPermissionsEnabled: UserPermissions = {
  dashboard: { view: true },
  moneyTransaction: { view: true, upload: true, addManually: true, download: true, manage: true },
  cryptoTransaction: { view: true, upload: true, download: true, manage: true },
  invoicesReceipts: { view: true, upload: true, addManually: true, manage: true, download: true },
  accountConfiguration: { view: true, edit: true },
  technicalConfiguration: { view: true, edit: true },
};

export const moduleLabels: Record<keyof UserPermissions, string> = {
  dashboard: "Dashboard",
  moneyTransaction: "Money Transaction",
  cryptoTransaction: "Crypto Transaction",
  invoicesReceipts: "Invoices & Receipts",
  accountConfiguration: "Account Configuration",
  technicalConfiguration: "Technical Configuration",
};

export const actionLabels: Record<string, string> = {
  view: "View",
  upload: "Upload",
  addManually: "Add manually",
  download: "Download",
  manage: "Manage",
  edit: "Edit",
};
