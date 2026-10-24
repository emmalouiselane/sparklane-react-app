import { ModuleId } from "../components/Sidebar";
import { SidebarModuleId } from "../config/modules";

export interface SidebarProps {
  items: ModuleNavItem[];
  activeModule: ModuleId;
  onSelectModule: (module: ModuleId) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  width: number;
  minWidth: number;
  maxWidth: number;
  onResize: (width: number) => void;
  user: any;
  onOpenAccountSettings: () => void;
  onLogout: () => void;
}

export interface ModuleNavItem {
  id: SidebarModuleId;
  label: string;
}
