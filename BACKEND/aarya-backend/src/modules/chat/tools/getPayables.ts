import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../config/supabase';

export const getPayables = tool(
  async (input, config) => {
    const companyId = config?.configurable?.companyId;
    if (!companyId) {
      return JSON.stringify({
        success: false,
        error: 'Authentication failed: companyId is missing in execution context.',
      });
    }

    try {
      const { dueAfter, limit } = input;
      // Default to today's date in YYYY-MM-DD format if not provided
      const dateFilter = dueAfter || new Date().toISOString().split('T')[0];

      const { data: transactions, error } = await supabaseAdmin
        .from('financial_transactions')
        .select('id, amount, due_date, description')
        .eq('company_id', companyId)
        .eq('transaction_type', 'expense')
        .gte('due_date', dateFilter)
        .order('due_date', { ascending: true })
        .limit(limit || 50);

      if (error) {
        return JSON.stringify({
          success: false,
          error: `Database error: ${error.message}`,
        });
      }

      let totalAmount = 0;
      const list = (transactions || []).map((tx: any) => {
        const amt = Number(tx.amount);
        totalAmount += amt;
        return {
          id: tx.id,
          amount: amt,
          dueDate: tx.due_date,
          description: tx.description,
        };
      });

      return JSON.stringify({
        success: true,
        data: {
          totalPayablesAmount: Number(totalAmount.toFixed(2)),
          count: list.length,
          dueAfter: dateFilter,
          payables: list,
        },
      });
    } catch (err: any) {
      return JSON.stringify({
        success: false,
        error: `Unexpected error retrieving payables: ${err.message || String(err)}`,
      });
    }
  },
  {
    name: 'get_payables',
    description: 'Retrieves outstanding expense/payable transactions and computes their total sum.',
    schema: z.object({
      dueAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueAfter must be YYYY-MM-DD').optional(),
      limit: z.number().int().min(1).max(200).optional().default(50),
    }),
  }
);

