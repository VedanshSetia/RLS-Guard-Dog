import { useState } from 'react';
import { 
  Users, 
  School, 
  BarChart3, 
  User, 
  BookOpen, 
  Settings,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const currentPath = location.pathname;

  const getNavItems = () => {
    switch (profile?.role) {
      case 'head_teacher':
        return [
          { title: 'Dashboard', url: '/head-teacher', icon: BarChart3 },
          { title: 'Classrooms', url: '/head-teacher/classrooms', icon: School },
          { title: 'Teachers', url: '/head-teacher/teachers', icon: Users },
          { title: 'Students', url: '/head-teacher/students', icon: GraduationCap },
        ];
      case 'teacher':
        return [
          { title: 'Dashboard', url: '/teacher', icon: BarChart3 },
          { title: 'My Classrooms', url: '/teacher/classrooms', icon: School },
          { title: 'Students', url: '/teacher/students', icon: GraduationCap },
        ];
      case 'student':
        return [
          { title: 'Dashboard', url: '/student', icon: BarChart3 },
          { title: 'My Progress', url: '/student/progress', icon: BookOpen },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const isActive = (path: string) => currentPath === path;
  const isExpanded = navItems.some((item) => isActive(item.url));
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar
      className={collapsed ? 'w-14' : 'w-60'}
      collapsible
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup open={isExpanded}>
          <SidebarGroupLabel>
            RLS Guard Dog
            {!collapsed && profile && (
              <span className="block text-xs text-muted-foreground capitalize mt-1">
                {profile.role.replace('_', ' ')} Portal
              </span>
            )}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {!collapsed && <span>Sign Out</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}