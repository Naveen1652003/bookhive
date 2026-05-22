import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { 
  Warehouse, LayoutDashboard, LibraryBig, ShoppingCart, 
  Users, Truck, Tags, History, LogOut, ChevronLeft, ChevronRight, Menu, Bell
} from 'lucide-react';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  const user = useAppSelector((state) => state.auth.user);
  
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Inventory', path: '/inventory', icon: LibraryBig },
    { name: 'Orders', path: '/orders', icon: ShoppingCart },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart },
    { name: 'Suppliers', path: '/suppliers', icon: Truck },
    { name: 'Categories', path: '/categories', icon: Tags },
    { name: 'Users', path: '/users', icon: Users, roles: ['Super Admin', 'Admin'] },
    { name: 'Audit & Sync Logs', path: '/logs', icon: History, roles: ['Super Admin', 'Admin'] },
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Determine current page title
  const currentItem = menuItems.find(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });
  const pageTitle = currentItem ? currentItem.name : 'System Panel';

  // Check if role has access to menu item
  const hasAccess = (item: typeof menuItems[0]) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-gray font-sans">
      
      {/* SIDEBAR FOR DESKTOP (Dark Navy: bg-brand-navy) */}
      <aside className={`hidden md:flex flex-col bg-brand-navy border-r border-slate-800 text-slate-300 transition-all duration-300 relative ${collapsed ? 'w-20' : 'w-64'}`}>
        
        {/* BRAND LOGO */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800 h-16 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-brand-yellow p-1.5 rounded flex items-center justify-center shrink-0">
              <Warehouse className="w-5 h-5 text-brand-navy" />
            </div>
            {!collapsed && (
              <span className="font-bold text-white text-base tracking-tight whitespace-nowrap">
                Book<span className="text-brand-yellow">Hive</span>
              </span>
            )}
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded bg-slate-900 border border-slate-800 hover:text-white text-slate-400 cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* SIDEBAR NAVIGATION ITEMS */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {menuItems.filter(hasAccess).map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                  isActive 
                    ? 'bg-brand-yellow text-brand-navy font-bold shadow-md shadow-yellow-500/10' 
                    : 'hover:bg-slate-900/80 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-brand-navy' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* PROFILE CONTROL / LOGOUT */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-3.5 shrink-0">
          {!collapsed && user && (
            <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
              <span className="block text-xs font-semibold text-white truncate">
                {user.first_name} {user.last_name}
              </span>
              <span className="block text-[10px] font-mono text-brand-yellow truncate uppercase mt-0.5 tracking-wider">
                {user.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-900 rounded-lg w-full transition cursor-pointer"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="font-semibold">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-brand-navy text-slate-300 transform transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 flex items-center justify-between border-b border-slate-800 h-16">
          <div className="flex items-center gap-2.5">
            <div className="bg-brand-yellow p-1.5 rounded flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-brand-navy" />
            </div>
            <span className="font-bold text-white text-base">Book<span className="text-brand-yellow">Hive</span></span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.filter(hasAccess).map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                  isActive 
                    ? 'bg-brand-yellow text-brand-navy font-bold' 
                    : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-navy' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 flex flex-col gap-3">
          {user && (
            <div className="bg-slate-900 p-2.5 rounded-lg">
              <span className="block text-xs font-semibold text-white">{user.first_name} {user.last_name}</span>
              <span className="block text-[10px] font-mono text-brand-yellow mt-0.5">{user.role}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-slate-900 rounded-lg w-full transition cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* SIGNATURE YELLOW HEADER SECTION (bg-brand-yellow) */}
        <header className="bg-brand-yellow text-brand-navy px-6 py-4 flex items-center justify-between shadow-md h-16 shrink-0 z-20">
          <div className="flex items-center gap-3.5">
            <button 
              onClick={() => setMobileOpen(true)}
              className="p-1 rounded hover:bg-yellow-500 md:hidden text-brand-navy cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold tracking-tight">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Stats Banner */}
            <div className="hidden lg:flex items-center gap-2 bg-brand-navy/10 py-1.5 px-3 rounded-full text-xs font-semibold border border-brand-navy/10">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
              <span>Shopify Sync Connected</span>
            </div>

            {/* Notification alert bell */}
            <button className="p-1.5 rounded-full hover:bg-yellow-500 transition text-brand-navy relative cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 border-2 border-brand-yellow rounded-full"></span>
            </button>

            {/* Desktop User Avatar Display */}
            {user && (
              <div className="flex items-center gap-2 border-l border-brand-navy/10 pl-4">
                <div className="w-8 h-8 rounded-full bg-brand-navy text-brand-yellow flex items-center justify-center font-bold text-sm shadow">
                  {user.first_name.slice(0,1)}{user.last_name.slice(0,1)}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <span className="block text-xs font-bold">{user.first_name} {user.last_name}</span>
                  <span className="block text-[10px] text-brand-navy/70 font-mono tracking-wide uppercase">{user.role}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* SCROLLABLE ROUTE PAGE CONTAINER */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-brand-gray relative">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
