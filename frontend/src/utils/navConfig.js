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
  FiDownload,
  FiZap,
  FiPlus
} from 'react-icons/fi';

// Roles allowed to see and use Quick Sale.
// Boss, Manager, Cashier. Store keeper and sales rep are excluded.
const QUICK_SALE_ROLES = ['boss', 'manager', 'cashier'];

export const getMenuGroups = (role, quickSaleEnabled = false) => {
  const isBoss = role === 'boss';
  const isManager = role === 'manager' || role === 'boss';
  const isCashier = role === 'cashier';
  const isStoreKeeper = role === 'store_keeper';
  const isSalesRep = role === 'sales_rep';

  const canUseQuickSale = QUICK_SALE_ROLES.includes(role);
  const showQuickSale = quickSaleEnabled && canUseQuickSale;

  // New Order (advanced) is hidden for cashiers when Quick Sale is on,
  // because for a cashier the two flows overlap. Managers and Bosses
  // keep both because they often need the advanced flow.
  const showAdvancedNewOrder =
    !isCashier ||
    !showQuickSale;

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
        { path: '/orders/quick', icon: FiZap, label: 'Quick Sale', show: showQuickSale },
        { path: '/orders/new', icon: FiPlus, label: 'New Order', show: showAdvancedNewOrder && !isStoreKeeper && !isSalesRep },
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
export const getFlatNavItems = (role, quickSaleEnabled = false) =>
  getMenuGroups(role, quickSaleEnabled).flatMap((group) =>
    group.items
      .filter((item) => item.show)
      .map((item) => ({ ...item, group: group.label }))
  );