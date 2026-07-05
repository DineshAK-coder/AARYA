import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../config/supabase';

export const getCashFlow = tool(
  async (input, config) => {
    const companyId = config?.configurable?.companyId;
    if (!companyId) {
      return JSON.stringify({
        success: false,
        error: 'Authentication failed: companyId is missing in execution context.',
      });
    }

    try {
      const { fromDate, toDate } = input;

      let query = supabaseAdmin
        .from('financial_transactions')
        .select('amount, transaction_type')
        .eq('company_id', companyId);

      if (fromDate) {
        query = query.gte('due_date', fromDate);
      }
      if (toDate) {
        query = query.lte('due_date', toDate);
      }

      // We support fetching up to 10,000 transactions for calculation
      const { data: transactions, error } = await query.limit(10000);

      if (error) {
        return JSON.stringify({
          success: false,
          error: `Failed to fetch transactions: ${error.message}`,
        });
      }

      let totalIncome = 0;
      let totalExpense = 0;

      if (transactions) {
        for (const tx of transactions) {
          const amt = Number(tx.amount);
          if (tx.transaction_type === 'income') {
            totalIncome += amt;
          } else if (tx.transaction_type === 'expense') {
            totalExpense += amt;
          }
        }
      }

      // Standardize to two decimal places
      totalIncome = Math.round(totalIncome * 100) / 100;
      totalExpense = Math.round(totalExpense * 100) / 100;
      const netCashFlow = Math.round((totalIncome - totalExpense) * 100) / 100;

      return JSON.stringify({
        success: true,
        data: {
          totalIncome,
          totalExpense,
          netCashFlow,
          transactionCount: transactions?.length || 0,
          fromDate: fromDate || null,
          toDate: toDate || null,
        },
      });
    } catch (err: any) {
      return JSON.stringify({
        success: false,
        error: `Unexpected error calculating cash flow: ${err.message || String(err)}`,
      });
    }
  },
  {
    name: 'get_cash_flow',
    description: 'Calculates the net cash flow (total income minus total expense) for the company within an optional date range.',
    schema: z.object({
      fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate must be YYYY-MM-DD').optional(),
      toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be YYYY-MM-DD').optional(),
    }),
  }
);

