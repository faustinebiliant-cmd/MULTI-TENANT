// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Dashboard Controller
// ============================================================

const supabase = require('../config/supabase');
const { getTodayRangeEAT } = require('../utils/tz');

const getDashboardStats = async (req, res) => {
    try {
        const { start, end } = getTodayRangeEAT();
        const startISO = start.toISOString();
        const endISO = end.toISOString();

        const [
            summaryResult,
            paymentsByMethodResult,
            outstandingResult,
            lowStockResult,
            customersResult,
            recentOrdersResult
        ] = await Promise.all([
            supabase.rpc('dashboard_summary', {
                start_date: startISO,
                end_date: endISO
            }),

            supabase.rpc('sum_payments_by_method', {
                start_date: startISO,
                end_date: endISO
            }),

            supabase.rpc('outstanding_today', {
                start_date: startISO,
                end_date: endISO
            }),

            supabase
                .from('products')
                .select('id, name, stock_quantity, low_stock_threshold')
                .eq('is_active', true),

            supabase
                .from('customers')
                .select('*', { count: 'exact', head: true }),

            supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    total_amount,
                    paid_amount,
                    order_status,
                    payment_status,
                    created_at,
                    customers:customer_id (name)
                `)
                .neq('order_status', 'cancelled')
                .order('created_at', { ascending: false })
                .limit(5)
        ]);

        if (summaryResult.error) throw summaryResult.error;
        if (paymentsByMethodResult.error) throw paymentsByMethodResult.error;
        if (outstandingResult.error) throw outstandingResult.error;
        if (lowStockResult.error) throw lowStockResult.error;
        if (customersResult.error) throw customersResult.error;
        if (recentOrdersResult.error) throw recentOrdersResult.error;

        const summaryRow = summaryResult.data?.[0] || {
            today_sales: 0,
            today_vat: 0,
            today_total_with_vat: 0,
            today_order_count: 0
        };

        const todaySales = Number(summaryRow.today_sales) || 0;
        const todayVAT = Number(summaryRow.today_vat) || 0;
        const todayTotalWithVAT = Number(summaryRow.today_total_with_vat) || 0;
        const totalOrders = Number(summaryRow.today_order_count) || 0;

        // Split payments by VAT ratio of each order
        const paymentRows = paymentsByMethodResult.data || [];
        const paymentOrderIds = [...new Set(paymentRows.map(r => r.order_id).filter(Boolean))];

        const orderVATRatioMap = {};
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
                    orderVATRatioMap[order.id] = orderVAT / orderTotal;
                }
            });
        }

        let businessMoneyReceived = 0;
        let vatCollectedFromPayments = 0;

        paymentRows.forEach(row => {
            const rowAmount = Number(row.total_amount) || 0;
            const vatRatio = orderVATRatioMap[row.order_id] || 0;
            const rowVAT = rowAmount * vatRatio;
            const rowBusiness = rowAmount - rowVAT;

            businessMoneyReceived += rowBusiness;
            vatCollectedFromPayments += rowVAT;
        });

        const outstandingRow = outstandingResult.data?.[0] || {
            outstanding_total: 0,
            unpaid_order_count: 0
        };
        const outstandingCredit = Number(outstandingRow.outstanding_total) || 0;

        const lowStock = lowStockResult.data || [];
        const lowStockItems = lowStock.filter(p => p.stock_quantity < p.low_stock_threshold);

        const totalCustomers = customersResult.count || 0;

        const recentOrders = recentOrdersResult.data || [];
        const formattedRecent = recentOrders.map(order => ({
            id: order.id,
            order_number: order.order_number,
            customer: order.customers?.name || 'Walk-in',
            total: order.total_amount,
            paid_amount: order.paid_amount,
            status: order.order_status,
            payment_status: order.payment_status,
            created_at: order.created_at
        }));

        const lowStockDetails = lowStockItems.slice(0, 5).map(p => ({
            name: p.name,
            stock: p.stock_quantity,
            threshold: p.low_stock_threshold
        }));

        return res.status(200).json({
            success: true,
            data: {
                todaySales,
                todayVATBilled: todayVAT,
                todayTotalWithVAT,
                businessMoneyReceived,
                vatCollectedFromPayments,
                outstandingCredit,
                totalOrders,
                lowStockItems: lowStockItems.length,
                totalCustomers,
                recentOrders: formattedRecent,
                lowStock: lowStockDetails
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard stats: ' + error.message
        });
    }
};

module.exports = {
    getDashboardStats
};