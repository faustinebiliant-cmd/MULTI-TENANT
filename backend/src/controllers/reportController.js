// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Reports Controller
// ============================================================
//
// What changed in this version:
//   1. Timezone: all date ranges now computed in Africa/Dar_es_Salaam
//      via utils/tz.js — fixes "today"/"week"/"month"/"year" drift
//      when the server runs in UTC.
//   2. Week rule: Monday → Sunday (Tanzania standard).
//   3. VAT rule: VAT Collected and product-level VAT now scale with
//      the fraction of each order that has actually been PAID.
//      A 50%-paid order shows 50% of its VAT as collected.
//   4. Removed getSalesReportLegacy — it duplicated logic and would
//      become a maintenance trap. The old version is preserved in
//      git / conversation history if needed.
//
// Business rules remain here. SQL only does raw sums.
// ============================================================

const supabase = require('../config/supabase');
const { parsePeriodEAT } = require('../utils/tz');

// ============================================================
// SALES REPORT
// ============================================================

const getSalesReport = async (req, res) => {
    try {
        const { start, end } = parsePeriodEAT(req.query);

        const startISO = start.toISOString();
        const endISO = end.toISOString();

        // ─── SQL AGGREGATIONS (parallel) ─────────────────────
        const [
            ordersRes,
            stockMovementsRes,
            monthlyRes,
            productSalesRes,
            paymentsByMethodRes,
            outstandingRes,
            ordersFullRes,
            paymentsRes,
            productsRes
        ] = await Promise.all([
            // 1. Summary totals
            supabase.rpc('sum_orders', {
                start_date: startISO,
                end_date: endISO,
                exclude_cancelled: true
            }),
            // 2. Stock movement totals per product
            supabase.rpc('sum_stock_movements', {
                start_date: startISO,
                end_date: endISO
            }),
            // 3. Monthly breakdown
            supabase.rpc('sum_monthly', {
                start_date: startISO,
                end_date: endISO,
                exclude_cancelled: true
            }),
            // 4. Product sales (used for top products)
            supabase.rpc('sum_product_sales', {
                start_date: startISO,
                end_date: endISO,
                exclude_cancelled: true
            }),
            // 5. Payments grouped by (method, order_id)
            supabase.rpc('sum_payments_by_method', {
                start_date: startISO,
                end_date: endISO
            }),
            // 6. Outstanding Credit (for this range)
            supabase.rpc('outstanding_today', {
                start_date: startISO,
                end_date: endISO
            }),
            // 7. Orders — needed for productFinancials + display slice
            supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    order_status,
                    payment_status,
                    subtotal,
                    tax_amount,
                    total_amount,
                    paid_amount,
                    created_at,
                    customers:customer_id (name, phone),
                    order_items (id, product_id, product_name, quantity, subtotal, cost_price)
                `)
                .gte('created_at', startISO)
                .lte('created_at', endISO)
                .neq('order_status', 'cancelled'),
            // 8. Payments — for display slice
            supabase
                .from('payments')
                .select('*')
                .gte('payment_date', startISO)
                .lte('payment_date', endISO),
            // 9. Products (for current stock in productStockMovements)
            supabase
                .from('products')
                .select('id, name, stock_quantity')
                .eq('is_active', true)
        ]);

        // ─── Handle SQL function results ─────────────────────
        const summaryRow = ordersRes.data?.[0] || {
            sum_subtotal: 0,
            sum_tax: 0,
            sum_total: 0,
            order_count: 0,
            item_count: 0
        };

        const totalSales = Number(summaryRow.sum_subtotal) || 0;
        const totalVAT = Number(summaryRow.sum_tax) || 0;
        const totalWithVAT = Number(summaryRow.sum_total) || 0;
        const totalOrders = Number(summaryRow.order_count) || 0;
        const totalItems = Number(summaryRow.item_count) || 0;
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        const orders = ordersFullRes.data || [];
        const payments = paymentsRes.data || [];
        const allProducts = productsRes.data || [];
        const monthlyRows = monthlyRes.data || [];
        const productSalesRows = productSalesRes.data || [];
        const stockMovementRows = stockMovementsRes.data || [];
        const paymentMethodRows = paymentsByMethodRes.data || [];

        // ─── Outstanding Credit (this range) ─────────────────
        const outstandingRow = outstandingRes.data?.[0] || {
            outstanding_total: 0,
            unpaid_order_count: 0
        };
        const outstandingCredit = Number(outstandingRow.outstanding_total) || 0;

        // ─── Monthly breakdown ────────────────────────────────
        const monthlyBreakdown = monthlyRows.map(row => {
            const d = new Date(row.month_start);
            const label = d.toLocaleString('default', {
                month: 'short',
                year: 'numeric',
                timeZone: 'Africa/Dar_es_Salaam'
            });
            return {
                month: label,
                revenue: Number(row.sum_subtotal) || 0,
                orders: Number(row.order_count) || 0,
                _sortKey: d
            };
        })
        .sort((a, b) => a._sortKey - b._sortKey)
        .map(({ _sortKey, ...rest }) => rest);

        // ─── Top products ────────────────────────────────────
        const topProducts = productSalesRows
            .map(row => ({
                name: row.product_name,
                quantity: Number(row.total_quantity) || 0,
                revenue: Number(row.total_revenue) || 0
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // ─── Stock movements ─────────────────────────────────
        const currentStockMap = {};
        allProducts.forEach(product => {
            currentStockMap[product.id] = {
                name: product.name,
                currentStock: product.stock_quantity || 0
            };
        });

        const nameToIdMap = {};
        orders.forEach(order => {
            if (order.order_items) {
                order.order_items.forEach(item => {
                    if (item.product_name && item.product_id && !nameToIdMap[item.product_name]) {
                        nameToIdMap[item.product_name] = item.product_id;
                    }
                });
            }
        });

        let stockAdded = 0;
        let stockSold = 0;
        let stockAdjusted = 0;
        let stockReturned = 0;
        const productStockMovements = {};

        stockMovementRows.forEach(row => {
            const productName = row.product_name || 'Unknown';
            const quantity = Number(row.total_quantity) || 0;
            const type = row.movement_type;

            if (!productStockMovements[productName]) {
                productStockMovements[productName] = {
                    product_id: nameToIdMap[productName] || null,
                    added: 0,
                    sold: 0,
                    adjusted: 0,
                    returned: 0,
                    netChange: 0
                };
            }

            if (type === 'PURCHASE') {
                stockAdded += quantity;
                productStockMovements[productName].added += quantity;
                productStockMovements[productName].netChange += quantity;
            } else if (type === 'SALE') {
                const absQ = Math.abs(quantity);
                stockSold += absQ;
                productStockMovements[productName].sold += absQ;
                productStockMovements[productName].netChange -= absQ;
            } else if (type === 'ADJUSTMENT') {
                if (quantity > 0) {
                    stockAdded += quantity;
                    productStockMovements[productName].adjusted += quantity;
                    productStockMovements[productName].netChange += quantity;
                } else {
                    stockAdjusted += Math.abs(quantity);
                    productStockMovements[productName].adjusted += quantity;
                    productStockMovements[productName].netChange += quantity;
                }
            } else if (type === 'RETURN') {
                stockReturned += quantity;
                productStockMovements[productName].returned += quantity;
                productStockMovements[productName].netChange += quantity;
            }
        });

        const productStockList = Object.entries(productStockMovements)
            .map(([name, data]) => {
                const currentStock = data.product_id
                    ? (currentStockMap[data.product_id]?.currentStock || 0)
                    : 0;
                const openingStock = currentStock - data.netChange;

                return {
                    name,
                    product_id: data.product_id,
                    openingStock,
                    added: data.added,
                    sold: data.sold,
                    adjusted: data.adjusted,
                    returned: data.returned,
                    netChange: data.netChange,
                    closingStock: currentStock
                };
            })
            .sort((a, b) => (b.added + b.sold + b.adjusted + b.returned) - (a.added + a.sold + a.adjusted + a.returned));

        // ─── Payments — VAT split by actual payments ─────────
        //
        // RULE (updated):
        //   VAT Collected = VAT portion of each payment
        //   For each (method, order_id) payment group from SQL:
        //     vatRatio = order.tax_amount / order.total_amount
        //     businessValue = amount × (1 - vatRatio)
        //     vatValue      = amount × vatRatio
        //
        // This gives us the money the shop actually received in
        // business terms vs. the VAT it is holding aside.
        const paymentMethods = { cash: 0, mpesa: 0, tigo_pesa: 0 };
        let totalPaymentsReceived = 0;   // business value
        let totalVATFromPayments = 0;    // VAT actually received

        const paymentOrderIds = [...new Set(paymentMethodRows.map(r => r.order_id).filter(Boolean))];

        const orderVATMap = {};
        if (paymentOrderIds.length > 0) {
            const { data: paymentOrders, error: poError } = await supabase
                .from('orders')
                .select('id, total_amount, tax_amount')
                .in('id', paymentOrderIds);

            if (poError) throw poError;

            (paymentOrders || []).forEach(order => {
                const orderTotal = parseFloat(order.total_amount) || 0;
                const orderVAT = parseFloat(order.tax_amount) || 0;
                if (orderTotal > 0 && orderVAT > 0) {
                    orderVATMap[order.id] = orderVAT / orderTotal;
                }
            });
        }

        paymentMethodRows.forEach(row => {
            const rowAmount = Number(row.total_amount) || 0;
            const method = row.method;
            const vatRatio = orderVATMap[row.order_id] || 0;
            const rowVAT = rowAmount * vatRatio;
            const rowBusiness = rowAmount - rowVAT;

            totalPaymentsReceived += rowBusiness;
            totalVATFromPayments += rowVAT;

            if (paymentMethods[method] !== undefined) {
                paymentMethods[method] += rowBusiness;
            }
        });

        // ─── Product financials (VAT scales with % paid) ─────
        //
        // RULE (updated):
        //   For each order, compute:
        //     paidRatio = paid_amount / total_amount  (0..1)
        //     payableVAT = tax_amount × paidRatio      (VAT actually collected)
        //
        //   Then distribute payableVAT across the order's items
        //   proportionally to each item's share of the order subtotal.
        //   Same for payments.
        const productFinancials = {};
        orders.forEach(order => {
            if (!order.order_items) return;

            const orderSubtotal = parseFloat(order.subtotal) || 0;
            const orderVAT = parseFloat(order.tax_amount) || 0;
            const orderPaid = parseFloat(order.paid_amount) || 0;
            const orderTotal = parseFloat(order.total_amount) || 0;

            // What fraction of this order has actually been paid?
            const paidRatio = orderTotal > 0
                ? Math.min(1, Math.max(0, orderPaid / orderTotal))
                : 0;

            // VAT that is actually collected for this order
            const orderVATCollected = orderVAT * paidRatio;

            // Business money paid for this order (excluding VAT portion)
            const orderBusinessPaid = orderPaid > 0 && orderTotal > 0 && orderVAT > 0
                ? orderPaid * (1 - (orderVAT / orderTotal))
                : orderPaid;

            order.order_items.forEach(item => {
                const productName = item.product_name || 'Unknown';
                if (!productFinancials[productName]) {
                    productFinancials[productName] = {
                        product_id: item.product_id,
                        sales: 0,
                        payments: 0,
                        vat: 0,
                        outstanding: 0
                    };
                }

                const itemSubtotal = parseFloat(item.subtotal) || 0;
                productFinancials[productName].sales += itemSubtotal;

                if (orderSubtotal > 0) {
                    const itemShare = itemSubtotal / orderSubtotal;

                    // VAT: scaled to what has been paid
                    productFinancials[productName].vat += orderVATCollected * itemShare;

                    // Payments: business value received for this item
                    if (orderBusinessPaid > 0) {
                        productFinancials[productName].payments += orderBusinessPaid * itemShare;
                    }
                }
            });
        });

        Object.keys(productFinancials).forEach(name => {
            const d = productFinancials[name];
            d.outstanding = d.sales - d.payments;
        });

        const productFinancialList = Object.entries(productFinancials)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 20);

        // ─── Response ─────────────────────────────────────────
        return res.status(200).json({
            success: true,
            data: {
                period: { start, end },
                summary: {
                    totalSales,
                    totalVAT,
                    totalWithVAT,
                    totalPaymentsReceived,
                    totalVATFromPayments,
                    outstandingCredit,
                    totalOrders,
                    totalItems,
                    averageOrderValue
                },
                stockSummary: {
                    stockAdded,
                    stockSold,
                    stockAdjusted,
                    stockReturned,
                    netStockChange: stockAdded + stockReturned - stockSold - stockAdjusted
                },
                productStockMovements: productStockList,
                productFinancials: productFinancialList,
                paymentMethods,
                topProducts,
                monthlyBreakdown,
                orders: orders.slice(0, 20),
                payments: payments.slice(0, 20)
            }
        });

    } catch (error) {
        console.error('Sales report error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate sales report: ' + error.message
        });
    }
};

// ============================================================
// YEAR-OVER-YEAR COMPARISON
// ============================================================
//
// FIX: VAT per year now reflects VAT that has actually been
// collected via payments (scaled by % paid per order), not the
// full order VAT.
//
// To do this we need each year's orders AND their payments.
// Rather than a per-order loop, we sum for each order:
//   businessValue = paid_amount × (1 - tax/total)
//   vatValue      = paid_amount × (tax/total)
// and then aggregate per year.

const getYearOverYear = async (req, res) => {
    try {
        const currentYearEAT = new Date().toLocaleString('en-GB', {
            timeZone: 'Africa/Dar_es_Salaam',
            year: 'numeric'
        });
        const currentYear = parseInt(currentYearEAT, 10);

        const years = [];
        for (let i = 0; i < 5; i++) {
            years.push(currentYear - i);
        }

        // Import the helper locally (keeps this function self-contained)
        const { getYearRangeEAT } = require('../utils/tz');

        const results = await Promise.all(years.map(async (year) => {
            const { start, end } = getYearRangeEAT(year);

            const { data: orders, error } = await supabase
                .from('orders')
                .select('subtotal, tax_amount, total_amount, paid_amount')
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString())
                .neq('order_status', 'cancelled');

            if (error) throw error;

            const list = orders || [];

            const revenue = list.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0);

            // Full VAT of the year (for reference / comparison)
            const vatFull = list.reduce((s, o) => s + (parseFloat(o.tax_amount) || 0), 0);

            // VAT actually collected = sum over orders of paid_amount × (tax / total)
            const vatCollected = list.reduce((s, o) => {
                const total = parseFloat(o.total_amount) || 0;
                const tax = parseFloat(o.tax_amount) || 0;
                const paid = parseFloat(o.paid_amount) || 0;
                if (total > 0 && tax > 0 && paid > 0) {
                    return s + (paid * (tax / total));
                }
                return s;
            }, 0);

            return {
                year,
                revenue,
                vat: vatCollected,        // ← scaled VAT (what the user asked for)
                vatFull,                   // ← keep full VAT for reference
                orders: list.length
            };
        }));

        const formatted = results.map((item, index) => ({
            ...item,
            growth: index > 0 && results[index - 1].revenue > 0
                ? ((item.revenue - results[index - 1].revenue) / results[index - 1].revenue * 100).toFixed(1)
                : null
        }));

        return res.status(200).json({
            success: true,
            data: formatted
        });

    } catch (error) {
        console.error('Year-over-year error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch year-over-year comparison'
        });
    }
};

// ============================================================
// PROFIT/LOSS REPORT (unchanged logic, EAT date ranges)
// ============================================================

const getProfitReport = async (req, res) => {
    try {
        const { start, end } = parsePeriodEAT(req.query);

        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())
            .neq('order_status', 'cancelled');

        if (error) throw error;

        let totalRevenue = 0;
        let totalVAT = 0;
        let totalCost = 0;
        let productProfit = {};

        orders.forEach(order => {
            totalRevenue += parseFloat(order.subtotal) || 0;
            totalVAT += parseFloat(order.tax_amount) || 0;

            if (order.order_items) {
                order.order_items.forEach(item => {
                    totalCost += (item.cost_price || 0) * (item.quantity || 0);
                    const key = item.product_name || 'Unknown';
                    if (!productProfit[key]) {
                        productProfit[key] = { revenue: 0, cost: 0, profit: 0 };
                    }
                    productProfit[key].revenue += item.subtotal || 0;
                    productProfit[key].cost += (item.cost_price || 0) * (item.quantity || 0);
                    productProfit[key].profit = productProfit[key].revenue - productProfit[key].cost;
                });
            }
        });

        const { data: expenses, error: expError } = await supabase
            .from('expenses')
            .select('*')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

        if (expError) throw expError;

        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const grossProfit = totalRevenue - totalCost;
        const netProfit = grossProfit - totalExpenses;

        const productProfitList = Object.entries(productProfit)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.profit - a.profit);

        return res.status(200).json({
            success: true,
            data: {
                period: { start, end },
                summary: {
                    totalRevenue,
                    totalVAT,
                    totalCost,
                    totalExpenses,
                    grossProfit,
                    netProfit,
                    margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
                },
                productProfit: productProfitList.slice(0, 10),
                expenses: expenses || []
            }
        });

    } catch (error) {
        console.error('Profit report error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate profit report'
        });
    }
};

// ============================================================
// INVENTORY REPORT (unchanged — no date range, no TZ issue)
// ============================================================

const getInventoryReport = async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                categories:category_id (name),
                suppliers:supplier_id (name)
            `)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        let totalCostValue = 0;
        let totalSellingValue = 0;
        let lowStockItems = [];
        let categoryBreakdown = {};

        products.forEach(product => {
            const costValue = (product.cost_price || 0) * (product.stock_quantity || 0);
            const sellingValue = (product.selling_price || 0) * (product.stock_quantity || 0);
            totalCostValue += costValue;
            totalSellingValue += sellingValue;

            if ((product.stock_quantity || 0) <= (product.low_stock_threshold || 5)) {
                lowStockItems.push({
                    name: product.name,
                    stock: product.stock_quantity,
                    threshold: product.low_stock_threshold
                });
            }

            const category = product.category_name || 'Uncategorized';
            if (!categoryBreakdown[category]) {
                categoryBreakdown[category] = { items: 0, value: 0 };
            }
            categoryBreakdown[category].items += 1;
            categoryBreakdown[category].value += costValue;
        });

        const categoryList = Object.entries(categoryBreakdown)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.value - a.value);

        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalProducts: products.length,
                    totalCostValue,
                    totalSellingValue,
                    potentialProfit: totalSellingValue - totalCostValue
                },
                lowStockItems,
                categoryBreakdown: categoryList,
                products: products.map(p => ({
                    ...p,
                    category_name: p.category_name || 'Uncategorized',
                    supplier_name: p.supplier_name || null
                }))
            }
        });

    } catch (error) {
        console.error('Inventory report error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate inventory report'
        });
    }
};

// ============================================================
// TOP CUSTOMERS REPORT (unchanged)
// ============================================================

const getTopCustomers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const { data: customers, error } = await supabase
            .from('customers')
            .select('id, name, phone, email, total_orders, total_spent')
            .order('total_spent', { ascending: false })
            .limit(parseInt(limit));

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data: customers
        });

    } catch (error) {
        console.error('Top customers error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch top customers'
        });
    }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getSalesReport,
    getYearOverYear,
    getProfitReport,
    getInventoryReport,
    getTopCustomers
};