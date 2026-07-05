import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';

export const getTools = (companyId: string) => ({
  get_cash_visibility: tool({
    description: 'Queries the database to calculate current total liquidity, cash-in, cash-out, and calculates runway based on burn rate.',
    parameters: zodSchema(z.object({
      monthly_burn_rate: z.number().optional().default(150000).describe('The simulated monthly burn rate of the company in base currency.'),
    })),
    execute: async ({ monthly_burn_rate }: { monthly_burn_rate: number }) => {
      try {
        const { data, error } = await supabaseAdmin
          .from('financial_transactions')
          .select('amount, transaction_type')
          .eq('company_id', companyId);

        if (error) throw error;

        let cashIn = 0;
        let cashOut = 0;
        (data || []).forEach((tx) => {
          const amt = Number(tx.amount);
          if (tx.transaction_type === 'income') {
            cashIn += amt;
          } else if (tx.transaction_type === 'expense') {
            cashOut += amt;
          }
        });

        const totalLiquidity = cashIn - cashOut;
        const runway = monthly_burn_rate > 0 ? (totalLiquidity / monthly_burn_rate).toFixed(1) : '0.0';

        return {
          total_liquidity: totalLiquidity,
          total_cash_in: cashIn,
          total_cash_out: cashOut,
          monthly_burn_rate,
          runway_months: runway,
        };
      } catch (err: any) {
        return { error: err.message || 'Database error occurred.' };
      }
    },
  }),
  get_receivables_and_payables: tool({
    description: 'Queries the database to list pending customer payments (receivables) and outstanding liabilities/bills (payables).',
    parameters: zodSchema(z.object({})),
    execute: async () => {
      try {
        const { data, error } = await supabaseAdmin
          .from('financial_transactions')
          .select('*')
          .eq('company_id', companyId)
          .order('due_date', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const receivables = (data || [])
          .filter((tx) => tx.transaction_type === 'income')
          .map((tx) => ({
            id: tx.id,
            description: tx.description || 'Unnamed invoice/income',
            amount: Number(tx.amount),
            due_date: tx.due_date,
            is_overdue: tx.due_date ? new Date(tx.due_date) < now : false,
          }));

        const payables = (data || [])
          .filter((tx) => tx.transaction_type === 'expense')
          .map((tx) => ({
            id: tx.id,
            description: tx.description || 'Unnamed liability/expense',
            amount: Number(tx.amount),
            due_date: tx.due_date,
            is_overdue: tx.due_date ? new Date(tx.due_date) < now : false,
          }));

        return {
          receivables,
          payables,
          total_receivables: receivables.reduce((sum, r) => sum + r.amount, 0),
          total_payables: payables.reduce((sum, p) => sum + p.amount, 0),
        };
      } catch (err: any) {
        return { error: err.message || 'Database error occurred.' };
      }
    },
  }),
  generate_founder_summary: tool({
    description: 'Analyzes the recent transactions to generate a brief summary of "What is good, what is risky, and what needs attention."',
    parameters: zodSchema(z.object({})),
    execute: async () => {
      try {
        const { data, error } = await supabaseAdmin
          .from('financial_transactions')
          .select('*')
          .eq('company_id', companyId)
          .order('due_date', { ascending: false });

        if (error) throw error;

        const txs = data || [];
        let totalIncome = 0;
        let totalExpense = 0;
        let overdueReceivables = 0;
        let overduePayables = 0;
        const now = new Date();

        txs.forEach((tx) => {
          const amt = Number(tx.amount);
          const isOverdue = tx.due_date ? new Date(tx.due_date) < now : false;
          if (tx.transaction_type === 'income') {
            totalIncome += amt;
            if (isOverdue) overdueReceivables += amt;
          } else if (tx.transaction_type === 'expense') {
            totalExpense += amt;
            if (isOverdue) overduePayables += amt;
          }
        });

        const attentionItems: string[] = [];
        const riskItems: string[] = [];
        const goodItems: string[] = [];

        if (overdueReceivables > 0) {
          attentionItems.push(
            `There are overdue customer invoices totaling ₹${overdueReceivables.toLocaleString()}. Collection outreach is critical.`
          );
        }
        if (overduePayables > 0) {
          riskItems.push(
            `Overdue payables/bills total ₹${overduePayables.toLocaleString()}. Outstanding liability poses payment risks.`
          );
        }
        if (totalIncome > totalExpense) {
          goodItems.push(
            `Operations are net-positive: total income (₹${totalIncome.toLocaleString()}) exceeds expenses (₹${totalExpense.toLocaleString()}).`
          );
        } else if (totalIncome < totalExpense) {
          riskItems.push(
            `Net burn rate risk: expenses (₹${totalExpense.toLocaleString()}) exceed income (₹${totalIncome.toLocaleString()}).`
          );
        }

        return {
          what_is_good: goodItems.length > 0 ? goodItems : ['No positive highlights to list yet.'],
          what_is_risky: riskItems.length > 0 ? riskItems : ['No high-risk indicators detected.'],
          what_needs_attention: attentionItems.length > 0 ? attentionItems : ['No urgent attention flags.'],
          summary_stats: {
            total_income: totalIncome,
            total_expense: totalExpense,
            net_position: totalIncome - totalExpense,
            overdue_receivables: overdueReceivables,
            overdue_payables: overduePayables,
          },
        };
      } catch (err: any) {
        return { error: err.message || 'Database error occurred.' };
      }
    },
  }),
});
