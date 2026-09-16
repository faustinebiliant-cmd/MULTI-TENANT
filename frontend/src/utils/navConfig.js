// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Navigation Config
// ============================================================
import {
  FiHome,
  FiPackage,
  FiGrid,
  FiUsers,
  FiShoppingCart,
  FiCreditCard,
  FiDollarSign,
  FiTruck,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiUserPlus,
  FiClipboard,
  FiDownload
} from 'react-icons/fi';

export const getMenuGroups = (role) => {
  const isBoss = role === 'boss';
  const isManager = role === 'manager' || role === 'boss';
  const isCashier = role === 'cashier';
  const isStoreKeeper = role === 'store_keeper';

  return [
    {
      label: 'Overview',
      items: [
        { path: '/dashboard', icon: FiHome, label: 'Dashboard', show: true }
      ]
    },
    {
      label: 'Sales',
      items: [
        { path: '/orders', icon: FiShoppingCart, label: 'Orders', show: true },
        { path: '/customers', icon: FiUsers, label: 'Customers', show: !isCashier && !isStoreKeeper },
        { path: '/payments', icon: FiCreditCard, label: 'Payments', show: isCashier || isManager || isBoss }
      ]
    },
    {
      label: 'Inventory',
      items: [
        { path: '/products', icon: FiPackage, label: 'Products', show: true },
        { path: '/categories', icon: FiGrid, label: 'Categories', show: isManager },
        { path: '/suppliers', icon: FiTruck, label: 'Suppliers', show: isManager },
        { path: '/purchase-orders', icon: FiFileText, label: 'Purchase Orders', show: isManager }
      ]
    },
    {
      label: 'Management',
      items: [
        { path: '/expenses', icon: FiDollarSign, label: 'Expenses', show: isManager },
        { path: '/reports/sales', icon: FiBarChart2, label: 'Reports', show: isManager },
        { path: '/reports/extract', icon: FiDownload, label: 'Extract Reports', show: isBoss },
        { path: '/audit-log', icon: FiClipboard, label: 'Audit Log', show: isBoss },
        { path: '/staff', icon: FiUserPlus, label: 'Staff', show: isBoss },
        { path: '/settings', icon: FiSettings, label: 'Settings', show: isBoss }
      ]
    }
  ];
};

// Flat, filtered list — what the command palette actually searches over.
// Each item keeps its group label as a subtitle so results read like
// "Products — Inventory" instead of just "Products".
export const getFlatNavItems = (role) =>
  getMenuGroups(role).flatMap((group) =>
    group.items
      .filter((item) => item.show)
      .map((item) => ({ ...item, group: group.label }))
  );
