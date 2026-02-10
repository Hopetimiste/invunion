import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserPermissions, moduleLabels, actionLabels, allPermissionsEnabled, defaultPermissions } from "@/types/permissions";

interface PermissionsEditorProps {
  permissions: UserPermissions;
  onChange: (permissions: UserPermissions) => void;
  isAdmin?: boolean;
  onAdminChange?: (isAdmin: boolean) => void;
}

export function PermissionsEditor({ permissions, onChange, isAdmin = false, onAdminChange }: PermissionsEditorProps) {
  const handlePermissionChange = (
    module: keyof UserPermissions,
    action: string,
    checked: boolean
  ) => {
    onChange({
      ...permissions,
      [module]: {
        ...permissions[module],
        [action]: checked,
      },
    });
  };

  const handleAdminToggle = (checked: boolean) => {
    onAdminChange?.(checked);
    if (checked) {
      onChange(allPermissionsEnabled);
    } else {
      onChange(defaultPermissions);
    }
  };

  const renderModulePermissions = (module: keyof UserPermissions) => {
    const modulePerms = permissions[module];
    const actions = Object.keys(modulePerms) as Array<keyof typeof modulePerms>;

    return (
      <div key={module} className="space-y-2">
        <Label className="font-medium text-sm">{moduleLabels[module]}</Label>
        <div className="flex flex-wrap gap-4 pl-2">
          {actions.map((action) => (
            <div key={action} className="flex items-center space-x-2">
              <Checkbox
                id={`${module}-${action}`}
                checked={modulePerms[action] as boolean}
                disabled={isAdmin}
                onCheckedChange={(checked) =>
                  handlePermissionChange(module, action, checked as boolean)
                }
              />
              <Label
                htmlFor={`${module}-${action}`}
                className="text-sm font-normal cursor-pointer"
              >
                {actionLabels[action]}
              </Label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
        <div className="space-y-0.5">
          <Label htmlFor="admin-toggle" className="font-semibold cursor-pointer">Administrator</Label>
          <p className="text-xs text-muted-foreground">Grant all permissions</p>
        </div>
        <Switch
          id="admin-toggle"
          checked={isAdmin}
          onCheckedChange={handleAdminToggle}
        />
      </div>
      <div className={isAdmin ? "opacity-50 pointer-events-none" : ""}>
        {(Object.keys(permissions) as Array<keyof UserPermissions>).map(renderModulePermissions)}
      </div>
    </div>
  );
}
