import { tool } from 'ai';
import { z } from 'zod/v3';
import { supabaseAdmin } from '../config/supabase.js';

export const getTools = (companyId: string) => ({
  get_cash_flow: tool({
    description: 'Queries the database to calculate current total cash flow, income, expenses, derived monthly burn rate, and runway months directly from transaction ledgers without requiring user inputs.',
    inputSchema: z.object({}),
    execute: async () => {
      const startTime = Date.now();
      console.log(`[AARYA Tool Tracing] Starting execution of 'get_cash_flow' for company: ${companyId}`);
      try {
        // ✅ FIX: Only select the specific columns required for cash-flow calculation
        // instead of select('*') which pulled every column (e.g. raw_row_data, metadata JSON blobs).
        const { data, error } = await supabaseAdmin
          .from('financial_transactions')
          .select('id, amount, transaction_type, due_date, created_at, description')
          .eq('company_id', companyId)
          .order('due_date', { ascending: false });

        if (error) throw error;

        const txs = data || [];
        let cashIn = 0;
        let cashOut = 0;
        let minExpenseTime: number = Number.MAX_SAFE_INTEGER;
        let maxExpenseTime: number = 0;
        let hasExpense = false;

        for (const tx of txs) {
          const amt = Number(tx.amount);
          const dateStr = tx.due_date || tx.created_at;
          const txTime = dateStr ? new Date(dateStr).getTime() : Date.now();

          if (tx.transaction_type === 'income') {
            cashIn += amt;
          } else if (tx.transaction_type === 'expense') {
            cashOut += amt;
            hasExpense = true;
            if (txTime < minExpenseTime) minExpenseTime = txTime;
            if (txTime > maxExpenseTime) maxExpenseTime = txTime;
          }
        }

        const netCashFlow = cashIn - cashOut;

        // Derive monthly burn rate directly from expense transaction date span
        let monthsSpan = 1.0;
        if (hasExpense && maxExpenseTime > minExpenseTime) {
          const diffMs = maxExpenseTime - minExpenseTime;
          const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
          monthsSpan = Math.max(1.0, diffMonths);
        }
        const derivedBurnRate = cashOut > 0 ? Number((cashOut / monthsSpan).toFixed(2)) : 0;
        const runway = derivedBurnRate > 0
          ? (netCashFlow > 0 ? (netCashFlow / derivedBurnRate).toFixed(1) : '0.0')
          : (netCashFlow >= 0 ? '999+' : '0.0');

        // Capture supporting transactions for explainability (top 15 only)
        const supportingTransactions = txs.slice(0, 15).map((tx: any) => ({
          id: tx.id,
          date: tx.due_date || tx.created_at?.slice(0, 10) || 'N/A',
          type: tx.transaction_type,
          amount: Number(tx.amount),
          description: tx.description || 'Unnamed transaction',
        }));

        const explanation = `Net Cash Flow (₹${netCashFlow.toLocaleString()}) = Total Income (₹${cashIn.toLocaleString()}) - Total Expenses (₹${cashOut.toLocaleString()}). Monthly Burn Rate (₹${derivedBurnRate.toLocaleString()}) was automatically derived across ${monthsSpan.toFixed(1)} month(s) of expense history. Estimated Runway: ${runway} months.`;

        const duration = Date.now() - startTime;
        console.log(`[AARYA Tool Tracing] Completed 'get_cash_flow' in ${duration}ms (${txs.length} records analyzed).`);

        // ── Non-blocking snapshot persist ─────────────────────────────────────
        // Convert the runway string ("25.3", "999+", "0.0") to a numeric value.
        const runwayNum = runway === '999+' ? 999 : parseFloat(runway as string);
        supabaseAdmin
          .from('financial_state_snapshots')
          .insert({
            company_id:    companyId,
            runway_months: isNaN(runwayNum) ? null : runwayNum,
            net_cash_flow: netCashFlow,
            snapshot_date: new Date().toISOString().split('T')[0],
          })
          .then(
            (result) => {
              if (result.error) console.error('[AARYA SnapshotSave] DB error:', result.error.message);
              else              console.log('[AARYA SnapshotSave] Snapshot saved for company:', companyId);
            },
            (err: unknown) => console.error('[AARYA SnapshotSave] Unexpected error:', err)
          );

        return {
          total_liquidity: netCashFlow,
          total_cash_in: cashIn,
          total_cash_out: cashOut,
          net_cash_flow: netCashFlow,
          derived_monthly_burn_rate: derivedBurnRate,
          runway_months: runway,
          calculation_explanation: explanation,
          supporting_transactions: supportingTransactions,
          _execution_meta: {
            tool_name: 'get_cash_flow',
            executed_at: new Date().toISOString(),
            duration_ms: duration,
            records_analyzed: txs.length,
            status: 'success',
          },
        };
      } catch (err: any) {
        const duration = Date.now() - startTime;
        console.error(`[AARYA Tool Tracing] Error in 'get_cash_flow' after ${duration}ms:`, err);
        return {
          error: err.message || 'Database error occurred.',
          _execution_meta: {
            tool_name: 'get_cash_flow',
            executed_at: new Date().toISOString(),
            duration_ms: duration,
            status: 'error',
          },
        };
      }
    },
  }),
  get_receivables_and_payables: tool({
    description: 'Queries the database to list pending customer payments (receivables) and outstanding liabilities/bills (payables).',
    inputSchema: z.object({}),
    execute: async () => {
      const startTime = Date.now();
      console.log(`[AARYA Tool Tracing] Starting execution of 'get_receivables_and_payables' for company: ${companyId}`);
      try {
        // ✅ FIX: Only select the specific columns needed to build receivable/payable lists.
        // Drops large JSON/text blob columns (raw_row_data, metadata, etc.) from the wire payload.
        const { data, error } = await supabaseAdmin
          .from('financial_transactions')
          .select('id, amount, transaction_type, due_date, description')
          .eq('company_id', companyId)
          .order('due_date', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const receivables = (data || [])
          .filter((tx: any) => tx.transaction_type === 'income')
          .map((tx: any) => ({
            id: tx.id,
            description: tx.description || 'Unnamed invoice/income',
            amount: Number(tx.amount),
            due_date: tx.due_date,
            is_overdue: tx.due_date ? new Date(tx.due_date) < now : false,
          }));

        const payables = (data || [])
          .filter((tx: any) => tx.transaction_type === 'expense')
          .map((tx: any) => ({
            id: tx.id,
            description: tx.description || 'Unnamed liability/expense',
            amount: Number(tx.amount),
            due_date: tx.due_date,
            is_overdue: tx.due_date ? new Date(tx.due_date) < now : false,
          }));

        const duration = Date.now() - startTime;
        console.log(`[AARYA Tool Tracing] Completed 'get_receivables_and_payables' in ${duration}ms.`);

        return {
          receivables,
          payables,
          total_receivables: receivables.reduce((sum: number, r: any) => sum + r.amount, 0),
          total_payables: payables.reduce((sum: number, p: any) => sum + p.amount, 0),
          _execution_meta: {
            tool_name: 'get_receivables_and_payables',
            executed_at: new Date().toISOString(),
            duration_ms: duration,
            records_analyzed: (data || []).length,
            status: 'success',
          },
        };
      } catch (err: any) {
        const duration = Date.now() - startTime;
        console.error(`[AARYA Tool Tracing] Error in 'get_receivables_and_payables' after ${duration}ms:`, err);
        return {
          error: err.message || 'Database error occurred.',
          _execution_meta: {
            tool_name: 'get_receivables_and_payables',
            executed_at: new Date().toISOString(),
            duration_ms: duration,
            status: 'error',
          },
        };
      }
    },
  }),
  generate_founder_summary: tool({
    description: 'Analyzes recent transactions to generate a comprehensive founder summary including revenue, expenses, net cash flow, receivables, payables, risks, and strategic recommendations.',
    inputSchema: z.object({}),
    execute: async () => {
      const startTime = Date.now();
      console.log(`[AARYA Tool Tracing] Starting execution of 'generate_founder_summary' for company: ${companyId}`);
      try {
        // ✅ FIX: Only select the minimal columns needed for the founder summary aggregation:
        // amount, transaction_type, and due_date. Avoids transferring description blobs
        // and other unused columns such as raw_row_data, metadata, etc.
        const { data, error } = await supabaseAdmin
          .from('financial_transactions')
          .select('amount, transaction_type, due_date')
          .eq('company_id', companyId)
          .order('due_date', { ascending: false });

        if (error) throw error;

        const txs = data || [];
        let totalIncome = 0;
        let totalExpense = 0;
        let totalReceivables = 0;
        let overdueReceivables = 0;
        let totalPayables = 0;
        let overduePayables = 0;
        const now = new Date();

        txs.forEach((tx: any) => {
          const amt = Number(tx.amount);
          const isOverdue = tx.due_date ? new Date(tx.due_date) < now : false;
          if (tx.transaction_type === 'income') {
            totalIncome += amt;
            totalReceivables += amt;
            if (isOverdue) overdueReceivables += amt;
          } else if (tx.transaction_type === 'expense') {
            totalExpense += amt;
            totalPayables += amt;
            if (isOverdue) overduePayables += amt;
          }
        });

        const netCashFlow = totalIncome - totalExpense;
        const attentionItems: string[] = [];
        const riskItems: string[] = [];
        const goodItems: string[] = [];
        const recommendations: string[] = [];

        if (overdueReceivables > 0) {
          attentionItems.push(
            `There are overdue customer invoices totaling ₹${overdueReceivables.toLocaleString()}. Collection outreach is critical.`
          );
          recommendations.push(
            `Send immediate automated payment reminders for the ₹${overdueReceivables.toLocaleString()} in overdue receivables to accelerate cash inflows.`
          );
        }
        if (overduePayables > 0) {
          riskItems.push(
            `Overdue payables/bills total ₹${overduePayables.toLocaleString()}. Outstanding liability poses immediate vendor payment risks.`
          );
          recommendations.push(
            `Prioritize settling or negotiating payment terms for overdue bills totaling ₹${overduePayables.toLocaleString()} to avoid penalties.`
          );
        }
        if (totalIncome > totalExpense) {
          goodItems.push(
            `Operations are net-positive: total revenue (₹${totalIncome.toLocaleString()}) exceeds expenses (₹${totalExpense.toLocaleString()}) by ₹${netCashFlow.toLocaleString()}.`
          );
          recommendations.push(
            `Reinvest net surplus of ₹${netCashFlow.toLocaleString()} into growth initiatives or high-yield liquidity reserves while maintaining a 6-month runway buffer.`
          );
        } else if (totalIncome < totalExpense) {
          riskItems.push(
            `Net burn rate risk: expenses (₹${totalExpense.toLocaleString()}) exceed income (₹${totalIncome.toLocaleString()}) resulting in a negative cash flow of ₹${netCashFlow.toLocaleString()}.`
          );
          recommendations.push(
            `Conduct an immediate cost audit on recurring operating expenses to bridge the ₹${Math.abs(netCashFlow).toLocaleString()} monthly cash deficit.`
          );
        }

        if (recommendations.length === 0) {
          recommendations.push(`Maintain regular ledger uploads and monitor weekly cash cycles to optimize working capital.`);
        }

        const duration = Date.now() - startTime;
        console.log(`[AARYA Tool Tracing] Completed 'generate_founder_summary' in ${duration}ms (${txs.length} records analyzed).`);

        return {
          revenue: totalIncome,
          expenses: totalExpense,
          net_cash_flow: netCashFlow,
          receivables: {
            total: totalReceivables,
            overdue: overdueReceivables,
          },
          payables: {
            total: totalPayables,
            overdue: overduePayables,
          },
          risks: riskItems.length > 0 ? riskItems : ['No high-risk indicators detected.'],
          recommendations,
          what_is_good: goodItems.length > 0 ? goodItems : ['No positive highlights to list yet.'],
          what_is_risky: riskItems.length > 0 ? riskItems : ['No high-risk indicators detected.'],
          what_needs_attention: attentionItems.length > 0 ? attentionItems : ['No urgent attention flags.'],
          summary_stats: {
            total_income: totalIncome,
            total_expense: totalExpense,
            net_position: netCashFlow,
            overdue_receivables: overdueReceivables,
            overdue_payables: overduePayables,
          },
          _execution_meta: {
            tool_name: 'generate_founder_summary',
            executed_at: new Date().toISOString(),
            duration_ms: duration,
            records_analyzed: txs.length,
            status: 'success',
          },
        };
      } catch (err: any) {
        const duration = Date.now() - startTime;
        console.error(`[AARYA Tool Tracing] Error in 'generate_founder_summary' after ${duration}ms:`, err);
        return {
          error: err.message || 'Database error occurred.',
          _execution_meta: {
            tool_name: 'generate_founder_summary',
            executed_at: new Date().toISOString(),
            duration_ms: duration,
            status: 'error',
          },
        };
      }
    },
  }),
});
