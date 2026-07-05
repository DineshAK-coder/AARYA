import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../config/supabase';

export const getFounderSummary = tool(
  async (_input, config) => {
    const companyId = config?.configurable?.companyId;
    if (!companyId) {
      return JSON.stringify({
        success: false,
        error: 'Authentication failed: companyId is missing in execution context.',
      });
    }

    try {
      // Run queries in parallel to optimize response latency
      const [txResult, snapshotResult, decisionsResult] = await Promise.all([
        supabaseAdmin
          .from('financial_transactions')
          .select('amount, transaction_type')
          .eq('company_id', companyId),
        supabaseAdmin
          .from('financial_state_snapshots')
          .select('runway_months, net_cash_flow, snapshot_date')
          .eq('company_id', companyId)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('decision_memory_logs')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId),
      ]);

      if (txResult.error) {
        return JSON.stringify({ success: false, error: `Transactions query error: ${txResult.error.message}` });
      }
      if (snapshotResult.error) {
        return JSON.stringify({ success: false, error: `Snapshot query error: ${snapshotResult.error.message}` });
      }
      if (decisionsResult.error) {
        return JSON.stringify({ success: false, error: `Decisions query error: ${decisionsResult.error.message}` });
      }

      let totalIncome = 0;
      let totalExpense = 0;
      let transferCount = 0;

      if (txResult.data) {
        for (const tx of txResult.data) {
          const amount = Number(tx.amount);
          if (tx.transaction_type === 'income') {
            totalIncome += amount;
          } else if (tx.transaction_type === 'expense') {
            totalExpense += amount;
          } else if (tx.transaction_type === 'transfer') {
            transferCount++;
          }
        }
      }

      const netCashFlow = totalIncome - totalExpense;

      const latestSnapshot = snapshotResult.data
        ? {
            runwayMonths: snapshotResult.data.runway_months ? Number(snapshotResult.data.runway_months) : null,
            netCashFlow: snapshotResult.data.net_cash_flow ? Number(snapshotResult.data.net_cash_flow) : null,
            snapshotDate: snapshotResult.data.snapshot_date,
          }
        : null;

      return JSON.stringify({
        success: true,
        data: {
          totalTransactions: txResult.data?.length || 0,
          totalIncome: Number(totalIncome.toFixed(2)),
          totalExpense: Number(totalExpense.toFixed(2)),
          netCashFlow: Number(netCashFlow.toFixed(2)),
          transferCount,
          latestSnapshot,
          totalLoggedDecisions: decisionsResult.count || 0,
        },
      });
    } catch (err: any) {
      return JSON.stringify({
        success: false,
        error: `Unexpected error generating founder summary: ${err.message || String(err)}`,
      });
    }
  },
  {
    name: 'get_founder_summary',
    description: 'Retrieves a high-level dashboard financial summary for the founder, including total income, expenses, latest snapshots, and decision ledger counts.',
    schema: z.object({}),
  }
);

