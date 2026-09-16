// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Export Controller
// Branch-scoped. Every query filters by branch_id.
// ============================================================

const ExcelJS = require('exceljs');
const supabase = require('../config/supabase');
const { parsePeriodEAT, formatDateEAT, formatDateTimeForExcel } = require('../utils/tz');
const { requireBranchId } = require('../utils/branchScope');

// Brand colours
const BRAND_BLUE = 'FF1A56DB';
const BRAND_DARK = 'FF0F172A';
const WHITE = 'FFFFFFFF';
const LIGHT_GRAY = 'FFF4F6F9';
const GRAY_TEXT = 'FF64748B';
const CURRENCY_FORMAT = '#,##0.00';

// ============================================================
// Shared styles
// ============================================================

const applyHeaderStyle = (row) => {
  row.font = { bold: true, color: { argb: WHITE }, size: 11 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
  row.alignment = { vertical: 'middle', horizontal: 'left' };
  row.height = 22;
  row.eachCell((cell) => {
    cell.border = { bottom: { style: 'thin', color: { argb: BRAND_DARK } } };
  });
};

const applyTitleStyle = (row, size = 14) => {
  row.font = { bold: true, size, color: { argb: BRAND_DARK } };
  row.height = 24;
};

const applyLabelStyle = (cell) => {
  cell.font = { bold: true, color: { argb: GRAY_TEXT } };
};

const applyTotalRowStyle = (row) => {
  row.font = { bold: true, color: { argb: BRAND_DARK } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } };
  row.eachCell((cell) => {
    cell.border = { top: { style: 'medium', color: { argb: BRAND_DARK } } };
  });
};

const styleSheetTitle = (sheet, title, subtitle, extraRows = []) => {
  sheet.getColumn(1).width = Math.max(sheet.getColumn(1).width || 25, 30);
  const titleRow = sheet.addRow([title]);
  sheet.mergeCells(`A${titleRow.number}:C${titleRow.number}`);
  applyTitleStyle(sheet.getRow(titleRow.number), 16);
  if (subtitle) {
    const subRow = sheet.addRow([subtitle]);
    sheet.mergeCells(`A${subRow.number}:C${subRow.number}`);
    applyTitleStyle(sheet.getRow(subRow.number), 12);
  }
  sheet.addRow([]);
  extraRows.forEach(([label, value]) => {
    const r = sheet.addRow([label, value]);
    applyLabelStyle(r.getCell(1));
  });
  sheet.addRow([]);
};

const addSectionHeader = (sheet, label) => {
  const row = sheet.addRow([label]);
  sheet.mergeCells(`A${row.number}:C${row.number}`);
  applyHeaderStyle(row);
};

// ============================================================
// Period helpers
// ============================================================

const parsePeriod = (query) => parsePeriodEAT(query);

const formatPeriodLabel = (start, end) => {
  const a = formatDateEAT(start);
  const b = formatDateEAT(end);
  return a === b ? a : `${a}_to_${b}`;
};

// ============================================================
// Data fetchers (all branch-scoped)
// ============================================================

const fetchOrders = async (branchId, startISO, endISO, includeCancelled = false) => {
  let query = supabase
    .from('orders')
    .select(`
      id, order_number, order_status, payment_status,
      subtotal, tax_amount, total_amount, paid_amount, created_at,
      cancellation_reason, cancelled_at, cancelled_by_name,
      customers:customer_id (name, phone),
      order_items (id, product_id, product_name, quantity, unit_price, subtotal, cost_price)
    `)
    .eq('branch_id', branchId)
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  if (!includeCancelled) {
    query = query.neq('order_status', 'cancelled');
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

const fetchPayments = async (branchId, startISO, endISO, includeVoided = false) => {
  let query = supabase
    .from('payments')
    .select('*')
    .eq('branch_id', branchId)
    .gte('payment_date', startISO)
    .lte('payment_date', endISO);

  if (!includeVoided) {
    query = query.neq('status', 'voided');
  }

  const { data, error } = await query.order('payment_date', { ascending: false });
  if (error) throw error;
  return data || [];
};

const filterRealOrders = (orders) => orders.filter(o => o.order_status !== 'cancelled');
const filterRealPayments = (payments) => payments.filter(p => (p.status || '').toLowerCase() !== 'voided');

const resolveOrderNumberMap = async (branchId, orders, payments) => {
  const map = {};
  orders.forEach(o => { map[o.id] = o.order_number; });

  const missingIds = [...new Set(payments.map(p => p.order_id).filter(id => id && !map[id]))];
  if (missingIds.length === 0) return map;

  const CHUNK = 200;
  for (let i = 0; i < missingIds.length; i += CHUNK) {
    const chunk = missingIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('branch_id', branchId)
      .in('id', chunk);
    if (error) throw error;
    (data || []).forEach(o => { map[o.id] = o.order_number; });
  }

  return map;
};

const fetchVATRatioMapForPayments = async (branchId, orders, payments) => {
  const map = {};
  orders.forEach(o => {
    const t = parseFloat(o.total_amount) || 0;
    const v = parseFloat(o.tax_amount) || 0;
    if (t > 0 && v > 0) map[o.id] = v / t;
  });

  const ids = [...new Set(payments.map(p => p.order_id).filter(Boolean))];
  if (ids.length === 0) return map;

  const { data } = await supabase
    .from('orders')
    .select('id, total_amount, tax_amount')
    .eq('branch_id', branchId)
    .in('id', ids);

  (data || []).forEach(o => {
    const t = parseFloat(o.total_amount) || 0;
    const v = parseFloat(o.tax_amount) || 0;
    if (t > 0 && v > 0 && !map[o.id]) map[o.id] = v / t;
  });

  return map;
};

const computePaymentTotals = (payments, vatMap) => {
  let business = 0, vat = 0;
  const methods = { cash: 0, mpesa: 0, tigo_pesa: 0 };

  payments.forEach(p => {
    if ((p.status || '').toLowerCase() === 'voided') return;
    const amt = parseFloat(p.amount) || 0;
    const ratio = vatMap[p.order_id] || 0;
    const pVAT = amt * ratio;
    const pBiz = amt - pVAT;
    business += pBiz;
    vat += pVAT;
    const m = (p.method || '').toLowerCase();
    if (methods[m] !== undefined) methods[m] += pBiz;
  });

  return { business, vat, methods, total: business + vat };
};

const computeVATCollectedFromOrders = (orders) => {
  return orders.reduce((sum, o) => {
    if (o.order_status === 'cancelled') return sum;
    const total = parseFloat(o.total_amount) || 0;
    const tax = parseFloat(o.tax_amount) || 0;
    const paid = parseFloat(o.paid_amount) || 0;
    if (total > 0 && tax > 0 && paid > 0) {
      return sum + (tax * Math.min(1, paid / total));
    }
    return sum;
  }, 0);
};

// ============================================================
// Sheet writers
// ============================================================

const writeOrdersSheet = (wb, orders) => {
  const ord = wb.addWorksheet('Orders');
  ord.columns = [
    { header: 'Order #', key: 'order_number', width: 20 },
    { header: 'Customer', key: 'customer', width: 30 },
    { header: 'Phone', key: 'phone', width: 20 },
    { header: 'Status', key: 'order_status', width: 14 },
    { header: 'Payment Status', key: 'payment_status', width: 16 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'VAT', key: 'tax_amount', width: 15 },
    { header: 'Total', key: 'total_amount', width: 15 },
    { header: 'Paid', key: 'paid_amount', width: 15 },
    { header: 'Balance', key: 'balance', width: 15 },
    { header: 'Cancellation Reason', key: 'cancellation_reason', width: 30 },
    { header: 'Date', key: 'created_at', width: 20 }
  ];
  applyHeaderStyle(ord.getRow(1));
  ord.views = [{ state: 'frozen', ySplit: 1 }];

  orders.forEach(o => {
    const tt = parseFloat(o.total_amount) || 0;
    const pp = parseFloat(o.paid_amount) || 0;
    const isCancelled = o.order_status === 'cancelled';
    ord.addRow({
      order_number: o.order_number,
      customer: o.customers?.name || 'Walk-in',
      phone: o.customers?.phone || '',
      order_status: o.order_status,
      payment_status: o.payment_status,
      subtotal: parseFloat(o.subtotal) || 0,
      tax_amount: parseFloat(o.tax_amount) || 0,
      total_amount: tt,
      paid_amount: isCancelled ? 0 : pp,
      balance: isCancelled ? 0 : (tt - pp),
      cancellation_reason: isCancelled ? (o.cancellation_reason || '') : '',
      created_at: formatDateTimeForExcel(o.created_at)
    });
  });

  ['subtotal', 'tax_amount', 'total_amount', 'paid_amount', 'balance'].forEach(c => {
    ord.getColumn(c).numFmt = CURRENCY_FORMAT;
  });

  return ord;
};

const writeOrderItemsSheet = (wb, realOrders) => {
  const itm = wb.addWorksheet('Order Items');
  itm.columns = [
    { header: 'Order #', key: 'order_number', width: 20 },
    { header: 'Product', key: 'product_name', width: 35 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Unit Price', key: 'unit_price', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 }
  ];
  applyHeaderStyle(itm.getRow(1));
  itm.views = [{ state: 'frozen', ySplit: 1 }];

  realOrders.forEach(o => {
    (o.order_items || []).forEach(i => {
      itm.addRow({
        order_number: o.order_number,
        product_name: i.product_name || 'Unknown',
        quantity: i.quantity,
        unit_price: parseFloat(i.unit_price) || 0,
        subtotal: parseFloat(i.subtotal) || 0
      });
    });
  });

  itm.getColumn('unit_price').numFmt = CURRENCY_FORMAT;
  itm.getColumn('subtotal').numFmt = CURRENCY_FORMAT;

  return itm;
};

const writePaymentsSheet = (wb, allPayments, orderNumberMap, showStatusColumn = true) => {
  const psheet = wb.addWorksheet('Payments');

  const columns = [
    { header: 'Payment Date', key: 'payment_date', width: 20 },
    { header: 'Order #', key: 'order_number', width: 20 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Method', key: 'method', width: 15 }
  ];
  if (showStatusColumn) columns.push({ header: 'Status', key: 'status', width: 14 });
  columns.push(
    { header: 'Reference', key: 'reference_number', width: 20 },
    { header: 'Recorded By', key: 'recorded_by_name', width: 25 }
  );
  psheet.columns = columns;
  applyHeaderStyle(psheet.getRow(1));
  psheet.views = [{ state: 'frozen', ySplit: 1 }];

  let totalAll = 0;
  let totalCompleted = 0;

  allPayments.forEach(p => {
    const amt = parseFloat(p.amount) || 0;
    const isVoided = (p.status || '').toLowerCase() === 'voided';
    totalAll += amt;
    if (!isVoided) totalCompleted += amt;

    const row = {
      payment_date: formatDateTimeForExcel(p.payment_date),
      order_number: orderNumberMap[p.order_id] || '(no order)',
      amount: amt,
      method: (p.method || '').toUpperCase(),
      reference_number: p.reference_number || '',
      recorded_by_name: p.recorded_by_name || ''
    };
    if (showStatusColumn) row.status = isVoided ? 'Voided' : 'Completed';
    psheet.addRow(row);
  });

  psheet.getColumn('amount').numFmt = CURRENCY_FORMAT;

  if (allPayments.length > 0) {
    const tr1 = psheet.addRow({ payment_date: 'TOTALS (completed only)', amount: totalCompleted });
    tr1.getCell('amount').numFmt = CURRENCY_FORMAT;
    applyTotalRowStyle(tr1);

    const tr2 = psheet.addRow({ payment_date: 'TOTALS (including voided)', amount: totalAll });
    tr2.getCell('amount').numFmt = CURRENCY_FORMAT;
    applyTotalRowStyle(tr2);
  }

  return psheet;
};

const writeProductsSheet = (wb, products, includeFinancials = true) => {
  const prod = wb.addWorksheet('Products');

  const columns = [
    { header: 'Product', key: 'name', width: 35 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'SKU', key: 'sku', width: 15 }
  ];
  if (includeFinancials) {
    columns.push(
      { header: 'Cost Price', key: 'cost_price', width: 15 },
      { header: 'Selling Price', key: 'selling_price', width: 15 }
    );
  }
  columns.push({ header: 'Stock', key: 'stock_quantity', width: 10 });
  prod.columns = columns;

  applyHeaderStyle(prod.getRow(1));
  prod.views = [{ state: 'frozen', ySplit: 1 }];

  products.forEach(p => {
    const row = {
      name: p.name,
      category: p.categories?.name || 'Uncategorized',
      sku: p.sku || '',
      stock_quantity: parseInt(p.stock_quantity) || 0
    };
    if (includeFinancials) {
      row.cost_price = parseFloat(p.cost_price) || 0;
      row.selling_price = parseFloat(p.selling_price) || 0;
    }
    prod.addRow(row);
  });

  if (includeFinancials) {
    prod.getColumn('cost_price').numFmt = CURRENCY_FORMAT;
    prod.getColumn('selling_price').numFmt = CURRENCY_FORMAT;
  }

  return prod;
};

const writeProductSalesSheet = (wb, productSales) => {
  const prodSales = wb.addWorksheet('Product Sales');
  prodSales.columns = [
    { header: 'Product', key: 'product_name', width: 40 },
    { header: 'Quantity Sold', key: 'total_quantity', width: 15 },
    { header: 'Revenue (excl. VAT)', key: 'total_revenue', width: 20 },
    { header: 'Cost', key: 'total_cost', width: 15 },
    { header: 'Profit', key: 'total_profit', width: 15 }
  ];
  applyHeaderStyle(prodSales.getRow(1));
  prodSales.views = [{ state: 'frozen', ySplit: 1 }];

  productSales.forEach(p => {
    const r = Number(p.total_revenue) || 0;
    const c = Number(p.total_cost) || 0;
    prodSales.addRow({
      product_name: p.product_name || '',
      total_quantity: Number(p.total_quantity) || 0,
      total_revenue: r,
      total_cost: c,
      total_profit: r - c
    });
  });

  ['total_revenue', 'total_cost', 'total_profit'].forEach(c => {
    prodSales.getColumn(c).numFmt = CURRENCY_FORMAT;
  });

  return prodSales;
};

// ============================================================
// EXPORTS
// ============================================================

const testExport = async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();
    const sheet = wb.addWorksheet('Test');
    sheet.addRow(['Hello', 'from', 'OSWAGO']);
    applyHeaderStyle(sheet.getRow(1));
    sheet.addRow(['This is a test export file.', '', '']);
    sheet.addRow(['Generated at:', formatDateTimeForExcel(new Date()), '']);
    sheet.addRow(['User:', req.user.email, '']);
    sheet.addRow(['Role:', req.user.role, '']);
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 40;
    sheet.getColumn(3).width = 20;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="oswago-test-export.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Test export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const exportSalesReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { start, end } = parsePeriod(req.query);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const [allOrders, allPayments, productSalesRes, outstandingRes] = await Promise.all([
      fetchOrders(branchId, startISO, endISO, true),
      fetchPayments(branchId, startISO, endISO, true),
      supabase.rpc('sum_product_sales', { start_date: startISO, end_date: endISO, exclude_cancelled: true, p_branch_id: branchId }),
      supabase.rpc('outstanding_today', { start_date: startISO, end_date: endISO, p_branch_id: branchId })
    ]);
    if (productSalesRes.error) throw productSalesRes.error;
    if (outstandingRes.error) throw outstandingRes.error;

    const productSales = productSalesRes.data || [];
    const outstandingCredit = Number(outstandingRes.data?.[0]?.outstanding_total) || 0;

    const realOrders = filterRealOrders(allOrders);
    const realPayments = filterRealPayments(allPayments);

    const totalSales = realOrders.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0);
    const totalVAT = realOrders.reduce((s, o) => s + (parseFloat(o.tax_amount) || 0), 0);
    const totalWithVAT = realOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
    const totalItems = realOrders.reduce((s, o) => s + (o.order_items || []).reduce((a, i) => a + (parseInt(i.quantity) || 0), 0), 0);
    const totalOrders = realOrders.length;
    const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

    const vatMap = await fetchVATRatioMapForPayments(branchId, allOrders, allPayments);
    const payTotals = computePaymentTotals(realPayments, vatMap);
    const vatCollected = computeVATCollectedFromOrders(realOrders);

    const orderNumberMap = await resolveOrderNumberMap(branchId, allOrders, allPayments);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const sum = wb.addWorksheet('Summary');
    sum.getColumn(1).width = 40;
    sum.getColumn(2).width = 25;
    sum.getColumn(3).width = 20;
    const t = sum.addRow(['OSWAGO Electrical Equipment']);
    sum.mergeCells(`A${t.number}:C${t.number}`);
    applyTitleStyle(sum.getRow(t.number), 16);
    const s = sum.addRow(['Sales Report']);
    sum.mergeCells(`A${s.number}:C${s.number}`);
    applyTitleStyle(sum.getRow(s.number), 13);
    sum.addRow([]);
    sum.addRow(['Period:', `${formatDateEAT(start)} to ${formatDateEAT(end)}`]);
    applyLabelStyle(sum.getCell(`A${sum.lastRow.number}`));
    sum.addRow(['Generated:', formatDateTimeForExcel(new Date())]);
    applyLabelStyle(sum.getCell(`A${sum.lastRow.number}`));
    sum.addRow([]);
    addSectionHeader(sum, 'SALES (excl. cancelled)');
    sum.addRow(['Total Sales (excl. VAT)', '', totalSales]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT on Sales (full, from orders)', '', totalVAT]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT Collected (scaled by % paid)', '', vatCollected]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Total Sales (incl. VAT)', '', totalWithVAT]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Total Orders', '', totalOrders]);
    sum.addRow(['Total Items Sold', '', totalItems]);
    sum.addRow(['Average Order Value (excl. VAT)', '', avgOrder]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow([]);
    addSectionHeader(sum, 'PAYMENTS (excl. voided)');
    sum.addRow(['Business Money Received', '', payTotals.business]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT Collected (from payments)', '', payTotals.vat]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Total Money Received (incl. VAT)', '', payTotals.total]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Outstanding Credit', '', outstandingCredit]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow([]);
    addSectionHeader(sum, 'PAYMENT METHODS (business value)');
    sum.addRow(['Cash', '', payTotals.methods.cash]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['M-Pesa', '', payTotals.methods.mpesa]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Tigo Pesa', '', payTotals.methods.tigo_pesa]).getCell('C').numFmt = CURRENCY_FORMAT;

    writeOrdersSheet(wb, allOrders);
    writeOrderItemsSheet(wb, realOrders);
    writePaymentsSheet(wb, allPayments, orderNumberMap, true);
    writeProductSalesSheet(wb, productSales);

    const fileName = `oswago-sales-${formatPeriodLabel(start, end)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Sales export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate sales export: ' + error.message });
  }
};

const exportPaymentsReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { start, end } = parsePeriod(req.query);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const [allOrders, allPayments] = await Promise.all([
      fetchOrders(branchId, startISO, endISO, true),
      fetchPayments(branchId, startISO, endISO, true)
    ]);

    const realPayments = filterRealPayments(allPayments);
    const vatMap = await fetchVATRatioMapForPayments(branchId, allOrders, realPayments);
    const totals = computePaymentTotals(realPayments, vatMap);
    const orderNumberMap = await resolveOrderNumberMap(branchId, allOrders, allPayments);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const sum = wb.addWorksheet('Summary');
    sum.getColumn(1).width = 40;
    sum.getColumn(2).width = 25;
    sum.getColumn(3).width = 20;
    styleSheetTitle(sum, 'OSWAGO Electrical Equipment', 'Payments Report', [
      ['Period:', `${formatDateEAT(start)} to ${formatDateEAT(end)}`],
      ['Generated:', formatDateTimeForExcel(new Date())]
    ]);

    const completedCount = realPayments.length;
    const voidedCount = allPayments.length - completedCount;

    addSectionHeader(sum, 'TOTALS');
    sum.addRow(['Business Money Received', '', totals.business]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT Collected', '', totals.vat]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Total Money Received', '', totals.total]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Number of Completed Payments', '', completedCount]);
    sum.addRow(['Number of Voided Payments', '', voidedCount]);
    sum.addRow([]);

    addSectionHeader(sum, 'PAYMENT METHODS (business value, completed only)');
    sum.addRow(['Cash', '', totals.methods.cash]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['M-Pesa', '', totals.methods.mpesa]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Tigo Pesa', '', totals.methods.tigo_pesa]).getCell('C').numFmt = CURRENCY_FORMAT;

    writePaymentsSheet(wb, allPayments, orderNumberMap, true);

    const fileName = `oswago-payments-${formatPeriodLabel(start, end)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Payments export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate payments export: ' + error.message });
  }
};

const exportExpensesReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { start, end } = parsePeriod(req.query);
    const startDay = formatDateEAT(start);
    const endDay = formatDateEAT(end);

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('branch_id', branchId)
      .gte('expense_date', startDay)
      .lte('expense_date', endDay)
      .order('expense_date', { ascending: false });
    if (error) throw error;

    const list = expenses || [];
    const total = list.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const byCat = {};
    list.forEach(e => {
      const c = e.category || 'Other';
      byCat[c] = (byCat[c] || 0) + (parseFloat(e.amount) || 0);
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const sum = wb.addWorksheet('Summary');
    sum.getColumn(1).width = 40;
    sum.getColumn(2).width = 25;
    sum.getColumn(3).width = 20;
    styleSheetTitle(sum, 'OSWAGO Electrical Equipment', 'Expenses Report', [
      ['Period:', `${startDay} to ${endDay}`],
      ['Generated:', formatDateTimeForExcel(new Date())]
    ]);

    addSectionHeader(sum, 'TOTALS');
    sum.addRow(['Total Expenses', '', total]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Number of Expenses', '', list.length]);
    sum.addRow([]);

    addSectionHeader(sum, 'BREAKDOWN BY CATEGORY');
    Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
      sum.addRow([cat, '', amt]).getCell('C').numFmt = CURRENCY_FORMAT;
    });

    const detail = wb.addWorksheet('Expenses');
    detail.columns = [
      { header: 'Date', key: 'expense_date', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Payment Method', key: 'payment_method', width: 18 },
      { header: 'Created By', key: 'created_by_name', width: 25 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];
    applyHeaderStyle(detail.getRow(1));
    detail.views = [{ state: 'frozen', ySplit: 1 }];

    list.forEach(e => {
      detail.addRow({
        expense_date: e.expense_date || '',
        description: e.description || '',
        category: e.category || 'Other',
        amount: parseFloat(e.amount) || 0,
        payment_method: e.payment_method || '',
        created_by_name: e.created_by_name || '',
        notes: e.notes || ''
      });
    });
    detail.getColumn('amount').numFmt = CURRENCY_FORMAT;

    if (list.length > 0) {
      const tr = detail.addRow({ description: 'TOTALS', amount: total });
      tr.getCell('amount').numFmt = CURRENCY_FORMAT;
      applyTotalRowStyle(tr);
    }

    const fileName = `oswago-expenses-${formatPeriodLabel(start, end)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Expenses export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate expenses export: ' + error.message });
  }
};

const exportProductsReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { data: products, error } = await supabase
      .from('products')
      .select(`*, categories:category_id (name), suppliers:supplier_id (name)`)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;

    const list = products || [];
    let totalCostValue = 0, totalSellingValue = 0;
    list.forEach(p => {
      totalCostValue += (parseFloat(p.cost_price) || 0) * (parseInt(p.stock_quantity) || 0);
      totalSellingValue += (parseFloat(p.selling_price) || 0) * (parseInt(p.stock_quantity) || 0);
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const sum = wb.addWorksheet('Summary');
    sum.getColumn(1).width = 40;
    sum.getColumn(2).width = 25;
    sum.getColumn(3).width = 20;
    styleSheetTitle(sum, 'OSWAGO Electrical Equipment', 'Products Report', [
      ['Generated:', formatDateTimeForExcel(new Date())]
    ]);

    addSectionHeader(sum, 'INVENTORY SUMMARY');
    sum.addRow(['Total Products', '', list.length]);
    sum.addRow(['Total Cost Value', '', totalCostValue]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Total Selling Value', '', totalSellingValue]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Potential Profit', '', totalSellingValue - totalCostValue]).getCell('C').numFmt = CURRENCY_FORMAT;

    writeProductsSheet(wb, list, true);

    const fileName = `oswago-products-${formatDateEAT(new Date())}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Products export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate products export: ' + error.message });
  }
};

const exportStockMovementsReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { start, end } = parsePeriod(req.query);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('branch_id', branchId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const productIds = [...new Set((movements || []).map(m => m.product_id).filter(Boolean))];
    let productMap = {};
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .eq('branch_id', branchId)
        .in('id', productIds);
      (products || []).forEach(p => productMap[p.id] = p.name);
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const detail = wb.addWorksheet('Stock Movements');
    detail.columns = [
      { header: 'Date', key: 'created_at', width: 20 },
      { header: 'Product', key: 'product_name', width: 35 },
      { header: 'Type', key: 'movement_type', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Reference', key: 'reference_number', width: 20 },
      { header: 'Reason', key: 'reason', width: 30 }
    ];
    applyHeaderStyle(detail.getRow(1));
    detail.views = [{ state: 'frozen', ySplit: 1 }];

    (movements || []).forEach(m => {
      detail.addRow({
        created_at: m.created_at ? formatDateTimeForExcel(m.created_at) : '',
        product_name: productMap[m.product_id] || '(unknown product)',
        movement_type: m.movement_type || '',
        quantity: parseInt(m.quantity) || 0,
        reference_number: m.reference_number || '',
        reason: m.reason || ''
      });
    });

    const fileName = `oswago-stock-movements-${formatPeriodLabel(start, end)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Stock movements export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate stock movements export: ' + error.message });
  }
};

const exportCustomersReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('branch_id', branchId)
      .order('name');
    if (error) throw error;

    const list = customers || [];

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const detail = wb.addWorksheet('Customers');
    detail.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Total Orders', key: 'total_orders', width: 14 },
      { header: 'Total Spent', key: 'total_spent', width: 15 },
      { header: 'Created', key: 'created_at', width: 18 }
    ];
    applyHeaderStyle(detail.getRow(1));
    detail.views = [{ state: 'frozen', ySplit: 1 }];

    list.forEach(c => {
      detail.addRow({
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        total_orders: parseInt(c.total_orders) || 0,
        total_spent: parseFloat(c.total_spent) || 0,
        created_at: c.created_at ? formatDateEAT(new Date(c.created_at)) : ''
      });
    });
    detail.getColumn('total_spent').numFmt = CURRENCY_FORMAT;

    if (list.length > 0) {
      const tr = detail.addRow({
        name: 'TOTALS',
        total_orders: list.reduce((s, c) => s + (parseInt(c.total_orders) || 0), 0),
        total_spent: list.reduce((s, c) => s + (parseFloat(c.total_spent) || 0), 0)
      });
      tr.getCell('total_spent').numFmt = CURRENCY_FORMAT;
      applyTotalRowStyle(tr);
    }

    const fileName = `oswago-customers-${formatDateEAT(new Date())}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Customers export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate customers export: ' + error.message });
  }
};

const exportSuppliersReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('branch_id', branchId)
      .order('name');
    if (error) throw error;

    const list = suppliers || [];

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const detail = wb.addWorksheet('Suppliers');
    detail.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Contact Person', key: 'contact_person', width: 25 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Created', key: 'created_at', width: 18 }
    ];
    applyHeaderStyle(detail.getRow(1));
    detail.views = [{ state: 'frozen', ySplit: 1 }];

    list.forEach(s => {
      detail.addRow({
        name: s.name || '',
        contact_person: s.contact_person || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        notes: s.notes || '',
        created_at: s.created_at ? formatDateEAT(new Date(s.created_at)) : ''
      });
    });

    const fileName = `oswago-suppliers-${formatDateEAT(new Date())}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Suppliers export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate suppliers export: ' + error.message });
  }
};

const exportPurchaseOrdersReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { start, end } = parsePeriod(req.query);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const { data: pos, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('branch_id', branchId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const list = pos || [];

    const supplierIds = [...new Set(list.map(p => p.supplier_id).filter(Boolean))];
    let supplierMap = {};
    if (supplierIds.length > 0) {
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('branch_id', branchId)
        .in('id', supplierIds);
      (suppliers || []).forEach(s => supplierMap[s.id] = s.name);
    }

    const poIds = list.map(p => p.id);
    let itemsByPO = {};
    if (poIds.length > 0) {
      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('*')
        .in('purchase_order_id', poIds);
      (items || []).forEach(i => {
        if (!itemsByPO[i.purchase_order_id]) itemsByPO[i.purchase_order_id] = [];
        itemsByPO[i.purchase_order_id].push(i);
      });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const poSheet = wb.addWorksheet('Purchase Orders');
    poSheet.columns = [
      { header: 'PO #', key: 'po_number', width: 18 },
      { header: 'Supplier', key: 'supplier_name', width: 30 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Total', key: 'total_amount', width: 15 },
      { header: 'Created', key: 'created_at', width: 20 },
      { header: 'Delivery Date', key: 'delivery_date', width: 15 },
      { header: 'Created By', key: 'created_by_name', width: 25 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];
    applyHeaderStyle(poSheet.getRow(1));
    poSheet.views = [{ state: 'frozen', ySplit: 1 }];

    list.forEach(p => {
      poSheet.addRow({
        po_number: p.po_number,
        supplier_name: supplierMap[p.supplier_id] || '',
        status: p.status,
        total_amount: parseFloat(p.total_amount) || 0,
        created_at: p.created_at ? formatDateTimeForExcel(p.created_at) : '',
        delivery_date: p.delivery_date || '',
        created_by_name: p.created_by_name || 'System',
        notes: p.notes || ''
      });
    });
    poSheet.getColumn('total_amount').numFmt = CURRENCY_FORMAT;

    const itemsSheet = wb.addWorksheet('PO Items');
    itemsSheet.columns = [
      { header: 'PO #', key: 'po_number', width: 18 },
      { header: 'Product', key: 'product_name', width: 35 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Cost Price', key: 'cost_price', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 }
    ];
    applyHeaderStyle(itemsSheet.getRow(1));
    itemsSheet.views = [{ state: 'frozen', ySplit: 1 }];

    const poNumMap = {};
    list.forEach(p => poNumMap[p.id] = p.po_number);
    Object.entries(itemsByPO).forEach(([poId, items]) => {
      items.forEach(i => {
        itemsSheet.addRow({
          po_number: poNumMap[poId] || '',
          product_name: i.product_name || '',
          quantity: i.quantity,
          cost_price: parseFloat(i.cost_price) || 0,
          subtotal: parseFloat(i.subtotal) || 0
        });
      });
    });
    itemsSheet.getColumn('cost_price').numFmt = CURRENCY_FORMAT;
    itemsSheet.getColumn('subtotal').numFmt = CURRENCY_FORMAT;

    const fileName = `oswago-purchase-orders-${formatPeriodLabel(start, end)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Purchase orders export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate purchase orders export: ' + error.message });
  }
};

const exportProfitReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { start, end } = parsePeriod(req.query);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const orders = await fetchOrders(branchId, startISO, endISO, false);

    let totalRevenue = 0, totalVAT = 0, totalCost = 0;
    const productProfit = {};

    orders.forEach(o => {
      totalRevenue += parseFloat(o.subtotal) || 0;
      totalVAT += parseFloat(o.tax_amount) || 0;
      (o.order_items || []).forEach(i => {
        const rev = parseFloat(i.subtotal) || 0;
        const cost = (parseFloat(i.cost_price) || 0) * (parseInt(i.quantity) || 0);
        totalCost += cost;
        const key = i.product_name || 'Unknown';
        if (!productProfit[key]) productProfit[key] = { revenue: 0, cost: 0 };
        productProfit[key].revenue += rev;
        productProfit[key].cost += cost;
      });
    });

    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('branch_id', branchId)
      .gte('created_at', startISO)
      .lte('created_at', endISO);

    const totalExpenses = (expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;
    const vatCollected = computeVATCollectedFromOrders(orders);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const sum = wb.addWorksheet('Summary');
    sum.getColumn(1).width = 40;
    sum.getColumn(2).width = 25;
    sum.getColumn(3).width = 20;
    styleSheetTitle(sum, 'OSWAGO Electrical Equipment', 'Profit & Loss Report', [
      ['Period:', `${formatDateEAT(start)} to ${formatDateEAT(end)}`],
      ['Generated:', formatDateTimeForExcel(new Date())]
    ]);

    addSectionHeader(sum, 'PROFIT & LOSS');
    sum.addRow(['Total Revenue (excl. VAT)', '', totalRevenue]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT on Sales (full, from orders)', '', totalVAT]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT Collected (scaled by % paid)', '', vatCollected]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Total Cost of Goods', '', totalCost]).getCell('C').numFmt = CURRENCY_FORMAT;
    const gp = sum.addRow(['Gross Profit', '', grossProfit]);
    gp.getCell('C').numFmt = CURRENCY_FORMAT;
    gp.font = { bold: true };
    sum.addRow(['Total Expenses', '', totalExpenses]).getCell('C').numFmt = CURRENCY_FORMAT;
    const np = sum.addRow(['Net Profit', '', netProfit]);
    np.getCell('C').numFmt = CURRENCY_FORMAT;
    np.font = { bold: true };
    sum.addRow(['Margin (%)', '', totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0]).getCell('C').numFmt = '0.00';

    const detail = wb.addWorksheet('Product Profit');
    detail.columns = [
      { header: 'Product', key: 'name', width: 35 },
      { header: 'Revenue', key: 'revenue', width: 15 },
      { header: 'Cost', key: 'cost', width: 15 },
      { header: 'Profit', key: 'profit', width: 15 }
    ];
    applyHeaderStyle(detail.getRow(1));
    detail.views = [{ state: 'frozen', ySplit: 1 }];

    Object.entries(productProfit).forEach(([name, d]) => {
      detail.addRow({ name, revenue: d.revenue, cost: d.cost, profit: d.revenue - d.cost });
    });
    ['revenue', 'cost', 'profit'].forEach(c => {
      detail.getColumn(c).numFmt = CURRENCY_FORMAT;
    });

    const fileName = `oswago-profit-${formatPeriodLabel(start, end)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Profit export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate profit export: ' + error.message });
  }
};

const exportVATReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { start, end } = parsePeriod(req.query);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const [orders, payments] = await Promise.all([
      fetchOrders(branchId, startISO, endISO, false),
      fetchPayments(branchId, startISO, endISO, false)
    ]);

    const totalVATFromOrders = orders.reduce((s, o) => s + (parseFloat(o.tax_amount) || 0), 0);
    const totalSalesExVAT = orders.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0);

    const vatMap = await fetchVATRatioMapForPayments(branchId, orders, payments);
    const totalVATFromPayments = payments.reduce((s, p) => {
      const amt = parseFloat(p.amount) || 0;
      const ratio = vatMap[p.order_id] || 0;
      return s + amt * ratio;
    }, 0);

    const vatCollected = computeVATCollectedFromOrders(orders);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const sum = wb.addWorksheet('VAT Summary');
    sum.getColumn(1).width = 40;
    sum.getColumn(2).width = 25;
    sum.getColumn(3).width = 20;
    styleSheetTitle(sum, 'OSWAGO Electrical Equipment', 'VAT Report', [
      ['Period:', `${formatDateEAT(start)} to ${formatDateEAT(end)}`],
      ['Generated:', formatDateTimeForExcel(new Date())]
    ]);

    addSectionHeader(sum, 'VAT COLLECTED');
    sum.addRow(['Total Sales (excl. VAT)', '', totalSalesExVAT]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT on Sales (full, from orders)', '', totalVATFromOrders]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT Collected (scaled by % paid)', '', vatCollected]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT Collected (from payments)', '', totalVATFromPayments]).getCell('C').numFmt = CURRENCY_FORMAT;

    const detail = wb.addWorksheet('Orders with VAT');
    detail.columns = [
      { header: 'Order #', key: 'order_number', width: 20 },
      { header: 'Date', key: 'created_at', width: 20 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'VAT', key: 'tax_amount', width: 15 },
      { header: 'Total', key: 'total_amount', width: 15 },
      { header: 'Payment Status', key: 'payment_status', width: 16 }
    ];
    applyHeaderStyle(detail.getRow(1));
    detail.views = [{ state: 'frozen', ySplit: 1 }];

    orders.forEach(o => {
      detail.addRow({
        order_number: o.order_number,
        created_at: formatDateTimeForExcel(o.created_at),
        subtotal: parseFloat(o.subtotal) || 0,
        tax_amount: parseFloat(o.tax_amount) || 0,
        total_amount: parseFloat(o.total_amount) || 0,
        payment_status: o.payment_status
      });
    });
    ['subtotal', 'tax_amount', 'total_amount'].forEach(c => {
      detail.getColumn(c).numFmt = CURRENCY_FORMAT;
    });

    if (orders.length > 0) {
      const tr = detail.addRow({
        order_number: 'TOTALS',
        subtotal: totalSalesExVAT,
        tax_amount: totalVATFromOrders,
        total_amount: totalSalesExVAT + totalVATFromOrders
      });
      ['subtotal', 'tax_amount', 'total_amount'].forEach(c => {
        tr.getCell(c).numFmt = CURRENCY_FORMAT;
      });
      applyTotalRowStyle(tr);
    }

    const fileName = `oswago-vat-${formatPeriodLabel(start, end)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('VAT export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate VAT export: ' + error.message });
  }
};

const exportFullReport = async (req, res) => {
  try {
    const branchId = await requireBranchId(req, res);
    if (!branchId) return;

    const { start, end } = parsePeriod(req.query);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const [allOrders, allPayments, productSalesRes, outstandingRes] = await Promise.all([
      fetchOrders(branchId, startISO, endISO, true),
      fetchPayments(branchId, startISO, endISO, true),
      supabase.rpc('sum_product_sales', { start_date: startISO, end_date: endISO, exclude_cancelled: true, p_branch_id: branchId }),
      supabase.rpc('outstanding_today', { start_date: startISO, end_date: endISO, p_branch_id: branchId })
    ]);
    if (productSalesRes.error) throw productSalesRes.error;
    if (outstandingRes.error) throw outstandingRes.error;

    const startDay = formatDateEAT(start);
    const endDay = formatDateEAT(end);

    const [
      { data: products },
      { data: expenses },
      { data: customers },
      { data: suppliers },
      { data: pos },
      { data: movements }
    ] = await Promise.all([
      supabase.from('products').select(`*, categories:category_id (name), suppliers:supplier_id (name)`).eq('branch_id', branchId).eq('is_active', true).order('name'),
      supabase.from('expenses').select('*').eq('branch_id', branchId).gte('expense_date', startDay).lte('expense_date', endDay).order('expense_date', { ascending: false }),
      supabase.from('customers').select('*').eq('branch_id', branchId).order('name'),
      supabase.from('suppliers').select('*').eq('branch_id', branchId).order('name'),
      supabase.from('purchase_orders').select('*').eq('branch_id', branchId).gte('created_at', startISO).lte('created_at', endISO).order('created_at', { ascending: false }),
      supabase.from('stock_movements').select('*').eq('branch_id', branchId).gte('created_at', startISO).lte('created_at', endISO).order('created_at', { ascending: false })
    ]);

    const realOrders = filterRealOrders(allOrders);
    const realPayments = filterRealPayments(allPayments);

    const productSales = productSalesRes.data || [];
    const outstandingCredit = Number(outstandingRes.data?.[0]?.outstanding_total) || 0;

    const totalSales = realOrders.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0);
    const totalVAT = realOrders.reduce((s, o) => s + (parseFloat(o.tax_amount) || 0), 0);
    const totalWithVAT = realOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
    const totalItems = realOrders.reduce((s, o) => s + (o.order_items || []).reduce((a, i) => a + (parseInt(i.quantity) || 0), 0), 0);
    const totalExpenses = (expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    let totalCost = 0;
    realOrders.forEach(o => {
      (o.order_items || []).forEach(i => {
        totalCost += (parseFloat(i.cost_price) || 0) * (parseInt(i.quantity) || 0);
      });
    });
    const grossProfit = totalSales - totalCost;
    const netProfit = grossProfit - totalExpenses;
    const vatCollected = computeVATCollectedFromOrders(realOrders);

    const vatMap = await fetchVATRatioMapForPayments(branchId, allOrders, realPayments);
    const payTotals = computePaymentTotals(realPayments, vatMap);
    const orderNumberMap = await resolveOrderNumberMap(branchId, allOrders, allPayments);

    const productIds = [...new Set((movements || []).map(m => m.product_id).filter(Boolean))];
    let productNameMap = {};
    if (productIds.length > 0) {
      const { data: prods } = await supabase.from('products').select('id, name').eq('branch_id', branchId).in('id', productIds);
      (prods || []).forEach(p => productNameMap[p.id] = p.name);
    }

    const supplierIds = [...new Set((pos || []).map(p => p.supplier_id).filter(Boolean))];
    let supplierMap = {};
    if (supplierIds.length > 0) {
      const { data: sups } = await supabase.from('suppliers').select('id, name').eq('branch_id', branchId).in('id', supplierIds);
      (sups || []).forEach(s => supplierMap[s.id] = s.name);
    }

    const poIds = (pos || []).map(p => p.id);
    let poItems = [];
    if (poIds.length > 0) {
      const { data: items } = await supabase.from('purchase_order_items').select('*').in('purchase_order_id', poIds);
      poItems = items || [];
    }
    const poNumMap = {};
    (pos || []).forEach(p => poNumMap[p.id] = p.po_number);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'OSWAGO Electrical Equipment';
    wb.created = new Date();

    const sum = wb.addWorksheet('Summary');
    sum.getColumn(1).width = 42;
    sum.getColumn(2).width = 25;
    sum.getColumn(3).width = 20;
    styleSheetTitle(sum, 'OSWAGO Electrical Equipment', 'Full Report', [
      ['Period:', `${startDay} to ${endDay}`],
      ['Generated:', formatDateTimeForExcel(new Date())]
    ]);
    addSectionHeader(sum, 'SALES (excl. cancelled)');
    sum.addRow(['Total Sales (excl. VAT)', '', totalSales]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT on Sales (full, from orders)', '', totalVAT]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT Collected (scaled by % paid)', '', vatCollected]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Total Sales (incl. VAT)', '', totalWithVAT]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Total Orders', '', realOrders.length]);
    sum.addRow(['Total Items Sold', '', totalItems]);
    sum.addRow([]);
    addSectionHeader(sum, 'PAYMENTS (excl. voided)');
    sum.addRow(['Business Money Received', '', payTotals.business]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['VAT from Payments', '', payTotals.vat]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Total Money Received', '', payTotals.total]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Outstanding Credit', '', outstandingCredit]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow([]);
    addSectionHeader(sum, 'PROFIT');
    sum.addRow(['Total Cost', '', totalCost]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Gross Profit', '', grossProfit]).getCell('C').numFmt = CURRENCY_FORMAT;
    sum.addRow(['Total Expenses', '', totalExpenses]).getCell('C').numFmt = CURRENCY_FORMAT;
    const np = sum.addRow(['Net Profit', '', netProfit]);
    np.getCell('C').numFmt = CURRENCY_FORMAT;
    np.font = { bold: true };
    sum.addRow([]);
    addSectionHeader(sum, 'OTHER COUNTS');
    sum.addRow(['Total Customers', '', (customers || []).length]);
    sum.addRow(['Total Suppliers', '', (suppliers || []).length]);
    sum.addRow(['Active Products', '', (products || []).length]);
    sum.addRow(['Purchase Orders', '', (pos || []).length]);

    writeOrdersSheet(wb, allOrders);
    writeOrderItemsSheet(wb, realOrders);
    writePaymentsSheet(wb, allPayments, orderNumberMap, true);
    writeProductsSheet(wb, products || [], true);
    writeProductSalesSheet(wb, productSales);

    const sm = wb.addWorksheet('Stock Movements');
    sm.columns = [
      { header: 'Date', key: 'created_at', width: 20 },
      { header: 'Product', key: 'product_name', width: 35 },
      { header: 'Type', key: 'movement_type', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Reference', key: 'reference_number', width: 20 },
      { header: 'Reason', key: 'reason', width: 30 }
    ];
    applyHeaderStyle(sm.getRow(1));
    sm.views = [{ state: 'frozen', ySplit: 1 }];
    (movements || []).forEach(m => {
      sm.addRow({
        created_at: m.created_at ? formatDateTimeForExcel(m.created_at) : '',
        product_name: productNameMap[m.product_id] || '',
        movement_type: m.movement_type || '',
        quantity: parseInt(m.quantity) || 0,
        reference_number: m.reference_number || '',
        reason: m.reason || ''
      });
    });

    const custSheet = wb.addWorksheet('Customers');
    custSheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Total Orders', key: 'total_orders', width: 14 },
      { header: 'Total Spent', key: 'total_spent', width: 15 }
    ];
    applyHeaderStyle(custSheet.getRow(1));
    custSheet.views = [{ state: 'frozen', ySplit: 1 }];
    (customers || []).forEach(c => {
      custSheet.addRow({
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        total_orders: parseInt(c.total_orders) || 0,
        total_spent: parseFloat(c.total_spent) || 0
      });
    });
    custSheet.getColumn('total_spent').numFmt = CURRENCY_FORMAT;

    const supSheet = wb.addWorksheet('Suppliers');
    supSheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Contact Person', key: 'contact_person', width: 25 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 28 }
    ];
    applyHeaderStyle(supSheet.getRow(1));
    supSheet.views = [{ state: 'frozen', ySplit: 1 }];
    (suppliers || []).forEach(s => {
      supSheet.addRow({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '' });
    });

    const poSheet = wb.addWorksheet('Purchase Orders');
    poSheet.columns = [
      { header: 'PO #', key: 'po_number', width: 18 },
      { header: 'Supplier', key: 'supplier_name', width: 30 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Total', key: 'total_amount', width: 15 },
      { header: 'Created', key: 'created_at', width: 20 }
    ];
    applyHeaderStyle(poSheet.getRow(1));
    poSheet.views = [{ state: 'frozen', ySplit: 1 }];
    (pos || []).forEach(p => {
      poSheet.addRow({
        po_number: p.po_number,
        supplier_name: supplierMap[p.supplier_id] || '',
        status: p.status,
        total_amount: parseFloat(p.total_amount) || 0,
        created_at: p.created_at ? formatDateTimeForExcel(p.created_at) : ''
      });
    });
    poSheet.getColumn('total_amount').numFmt = CURRENCY_FORMAT;

    const poItemsSheet = wb.addWorksheet('PO Items');
    poItemsSheet.columns = [
      { header: 'PO #', key: 'po_number', width: 18 },
      { header: 'Product', key: 'product_name', width: 35 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Cost Price', key: 'cost_price', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 }
    ];
    applyHeaderStyle(poItemsSheet.getRow(1));
    poItemsSheet.views = [{ state: 'frozen', ySplit: 1 }];
    poItems.forEach(i => {
      poItemsSheet.addRow({
        po_number: poNumMap[i.purchase_order_id] || '',
        product_name: i.product_name || '',
        quantity: i.quantity,
        cost_price: parseFloat(i.cost_price) || 0,
        subtotal: parseFloat(i.subtotal) || 0
      });
    });
    poItemsSheet.getColumn('cost_price').numFmt = CURRENCY_FORMAT;
    poItemsSheet.getColumn('subtotal').numFmt = CURRENCY_FORMAT;

    const expSheet = wb.addWorksheet('Expenses');
    expSheet.columns = [
      { header: 'Date', key: 'expense_date', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Payment Method', key: 'payment_method', width: 18 },
      { header: 'Created By', key: 'created_by_name', width: 25 }
    ];
    applyHeaderStyle(expSheet.getRow(1));
    expSheet.views = [{ state: 'frozen', ySplit: 1 }];
    (expenses || []).forEach(e => {
      expSheet.addRow({
        expense_date: e.expense_date || '',
        description: e.description || '',
        category: e.category || 'Other',
        amount: parseFloat(e.amount) || 0,
        payment_method: e.payment_method || '',
        created_by_name: e.created_by_name || ''
      });
    });
    expSheet.getColumn('amount').numFmt = CURRENCY_FORMAT;

    const plSheet = wb.addWorksheet('Profit & Loss');
    plSheet.getColumn(1).width = 40;
    plSheet.getColumn(2).width = 25;
    plSheet.getColumn(3).width = 20;
    plSheet.addRow(['Profit & Loss']);
    applyTitleStyle(plSheet.getRow(1), 14);
    plSheet.addRow([]);
    plSheet.addRow(['Total Revenue (excl. VAT)', '', totalSales]).getCell('C').numFmt = CURRENCY_FORMAT;
    plSheet.addRow(['VAT on Sales (full)', '', totalVAT]).getCell('C').numFmt = CURRENCY_FORMAT;
    plSheet.addRow(['VAT Collected (scaled by % paid)', '', vatCollected]).getCell('C').numFmt = CURRENCY_FORMAT;
    plSheet.addRow(['Total Cost of Goods', '', totalCost]).getCell('C').numFmt = CURRENCY_FORMAT;
    const gpRow = plSheet.addRow(['Gross Profit', '', grossProfit]);
    gpRow.getCell('C').numFmt = CURRENCY_FORMAT;
    gpRow.font = { bold: true };
    plSheet.addRow(['Total Expenses', '', totalExpenses]).getCell('C').numFmt = CURRENCY_FORMAT;
    const npRow = plSheet.addRow(['Net Profit', '', netProfit]);
    npRow.getCell('C').numFmt = CURRENCY_FORMAT;
    npRow.font = { bold: true };

    const vatSheet = wb.addWorksheet('VAT Report');
    vatSheet.getColumn(1).width = 40;
    vatSheet.getColumn(2).width = 25;
    vatSheet.getColumn(3).width = 20;
    vatSheet.addRow(['VAT Report']);
    applyTitleStyle(vatSheet.getRow(1), 14);
    vatSheet.addRow([]);
    vatSheet.addRow(['Sales (excl. VAT)', '', totalSales]).getCell('C').numFmt = CURRENCY_FORMAT;
    vatSheet.addRow(['VAT on Sales (full, from orders)', '', totalVAT]).getCell('C').numFmt = CURRENCY_FORMAT;
    vatSheet.addRow(['VAT Collected (scaled by % paid)', '', vatCollected]).getCell('C').numFmt = CURRENCY_FORMAT;
    vatSheet.addRow(['VAT from Payments', '', payTotals.vat]).getCell('C').numFmt = CURRENCY_FORMAT;

    const fileName = `oswago-full-${formatPeriodLabel(start, end)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Full export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate full export: ' + error.message });
  }
};

module.exports = {
  testExport,
  exportSalesReport,
  exportPaymentsReport,
  exportExpensesReport,
  exportProductsReport,
  exportStockMovementsReport,
  exportCustomersReport,
  exportSuppliersReport,
  exportPurchaseOrdersReport,
  exportProfitReport,
  exportVATReport,
  exportFullReport
};