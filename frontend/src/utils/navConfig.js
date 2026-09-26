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

const QUICK_SALE_ROLES = ['boss', 'manager', 'cashier'];

export const getMenuGroups = (role, quickSaleEnabled = false) => {
  const isBoss = role === 'boss';
  const isManager = role === 'manager' || role === 'boss';
  const isCashier = role === 'cashier';
  const isStoreKeeper = role === 'store_keeper';
  const isSalesRep = role === 'sales_rep';

  const canUseQuickSale = QUICK_SALE_ROLES.includes(role);
  const showQuickSale = quickSaleEnabled && canUseQuickSale;

  const showAdvancedNewOrder =
    !isCashier ||
    !showQuickSale;

  return [
    {
      labelKey: 'nav.groups.overview',
      items: [
        { path: '/dashboard', icon: FiHome, labelKey: 'nav.items.dashboard', show: true }
      ]
    },
    {
      labelKey: 'nav.groups.sales',
      items: [
        { path: '/orders/quick', icon: FiZap, labelKey: 'nav.items.quick_sale', show: showQuickSale },
        { path: '/orders/new', icon: FiPlus, labelKey: 'nav.items.new_order', show: showAdvancedNewOrder && !isStoreKeeper && !isSalesRep },
        { path: '/orders', icon: FiShoppingCart, labelKey: 'nav.items.orders', show: true },
        { path: '/customers', icon: FiUsers, labelKey: 'nav.items.customers', show: !isCashier && !isStoreKeeper },
        { path: '/payments', icon: FiCreditCard, labelKey: 'nav.items.payments', show: isCashier || isManager || isBoss }
      ]
    },
    {
      labelKey: 'nav.groups.inventory',
      items: [
        { path: '/products', icon: FiPackage, labelKey: 'nav.items.products', show: true },
        { path: '/categories', icon: FiGrid, labelKey: 'nav.items.categories', show: isManager },
        { path: '/suppliers', icon: FiTruck, labelKey: 'nav.items.suppliers', show: isManager },
        { path: '/purchase-orders', icon: FiFileText, labelKey: 'nav.items.purchase_orders', show: isManager }
      ]
    },
    {
      labelKey: 'nav.groups.management',
      items: [
        { path: '/expenses', icon: FiDollarSign, labelKey: 'nav.items.expenses', show: isManager },
        { path: '/reports/sales', icon: FiBarChart2, labelKey: 'nav.items.reports', show: isManager },
        { path: '/reports/extract', icon: FiDownload, labelKey: 'nav.items.extract_reports', show: isBoss },
        { path: '/audit-log', icon: FiClipboard, labelKey: 'nav.items.audit_log', show: isBoss },
        { path: '/staff', icon: FiUserPlus, labelKey: 'nav.items.staff', show: isBoss },
        { path: '/settings', icon: FiSettings, labelKey: 'nav.items.settings', show: isBoss }
      ]
    }
  ];
};