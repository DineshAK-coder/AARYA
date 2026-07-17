import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { BusinessState } from "../types";
import { getTransactions, getSnapshots } from "../services/apiClient";

export interface FinancialContextType {
  receivables: number;
  payables: number;
  netCashFlow: number;
  runwayMonths: number;
  runwayMonthsFormatted: string;
  runwayStatus: "SECURE" | "WARNING" | "CRITICAL";
  transactions: any[];
  snapshots: any[];
  overdue30DaysCount: number;
  overdue30DaysTotal: number;
  loading: boolean;
  refreshFinancials: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

interface FinancialProviderProps {
  state: BusinessState;
  children: React.ReactNode;
}

export const FinancialProvider: React.FC<FinancialProviderProps> = ({ state, children }) => {
  // Fallback calculations derived directly from local state.ledger
  const ledgerReceivables = useMemo(() => 
    state.ledger
      .filter(item => item.amount > 0)
      .reduce((sum, item) => sum + item.amount, 0),
  [state.ledger]);

  const ledgerPayables = useMemo(() => 
    state.ledger
      .filter(item => item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0),
  [state.ledger]);

  const [receivables, setReceivables] = useState<number>(ledgerReceivables);
  const [payables, setPayables] = useState<number>(ledgerPayables);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync local ledger totals only if API fetch failed or offline
  useEffect(() => {
    if (!loading && transactions.length === 0 && receivables === 0 && ledgerReceivables > 0 && state.ledger.length > 0) {
      setReceivables(ledgerReceivables);
    }
    if (!loading && transactions.length === 0 && payables === 0 && ledgerPayables > 0 && state.ledger.length > 0) {
      setPayables(ledgerPayables);
    }
  }, [ledgerReceivables, ledgerPayables, loading, receivables, payables, transactions.length, state.ledger.length]);

  const refreshFinancials = useCallback(async () => {
    setLoading(true);
    try {
      const [incomeRes, expenseRes, snapshotsRes] = await Promise.all([
        getTransactions({ transaction_type: "income", limit: 500 }) as Promise<any>,
        getTransactions({ transaction_type: "expense", limit: 500 }) as Promise<any>,
        getSnapshots({ limit: 50 }) as Promise<any>,
      ]);

      const incomeTxs = incomeRes?.data?.data ?? [];
      const expenseTxs = expenseRes?.data?.data ?? [];
      const allTxs = [...incomeTxs, ...expenseTxs];
      setTransactions(allTxs);

      const snapshotsData = snapshotsRes?.data?.data ?? [];
      setSnapshots(snapshotsData);

      const incomeTotal = incomeTxs.reduce(
        (sum: number, tx: any) => sum + Math.abs(Number(tx.amount) || 0), 0
      );
      const expenseTotal = expenseTxs.reduce(
        (sum: number, tx: any) => sum + Math.abs(Number(tx.amount) || 0), 0
      );

      // Trust the database transaction totals when API resolves successfully
      setReceivables(incomeTotal);
      setPayables(expenseTotal);
    } catch (err) {
      console.warn("[FinancialContext] Could not fetch transactions API, using ledger fallback:", err);
      setReceivables(ledgerReceivables);
      setPayables(ledgerPayables);
    } finally {
      setLoading(false);
    }
  }, [ledgerReceivables, ledgerPayables]);

  useEffect(() => {
    refreshFinancials();
  }, [state.companyId, refreshFinancials]);

  const netCashFlow = receivables - payables;
  
  const simulatedMonthlyBurn = 150000;
  const runwayMonthsNum = receivables > 0
    ? receivables / simulatedMonthlyBurn
    : (state.startingBalance > 0 ? state.startingBalance / simulatedMonthlyBurn : 0);

  const runwayMonthsFormatted = runwayMonthsNum.toFixed(1);
  const runwayStatus = runwayMonthsNum >= 8 ? "SECURE" : runwayMonthsNum >= 4 ? "WARNING" : "CRITICAL";

  // Compute live 30 days overdue items from backend transactions and state fallback
  const { overdue30DaysCount, overdue30DaysTotal } = useMemo(() => {
    let count = 0;
    let total = 0;
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const countedIds = new Set<string>();

    // 1. Check live backend transactions (specifically income / receivables crossing 30 days)
    if (transactions.length > 0) {
      for (const tx of transactions) {
        if (tx.transaction_type === "income" && tx.due_date) {
          const dueTime = new Date(tx.due_date).getTime();
          if (!isNaN(dueTime) && (now - dueTime) >= thirtyDaysMs) {
            count++;
            total += Math.abs(Number(tx.amount) || 0);
            if (tx.id) countedIds.add(String(tx.id));
            if (tx.description) countedIds.add(tx.description.toLowerCase());
          }
        }
      }
    }

    // 2. Check local invoices
    for (const inv of state.invoices) {
      if (inv.status === "Overdue" || inv.dueDate) {
        const dueTime = inv.dueDate ? new Date(inv.dueDate).getTime() : NaN;
        const isThirtyDays = !isNaN(dueTime) ? (now - dueTime) >= thirtyDaysMs : (inv.status === "Overdue");
        if (isThirtyDays && !countedIds.has(inv.id) && !countedIds.has(inv.customer.toLowerCase())) {
          count++;
          total += inv.amount;
          countedIds.add(inv.id);
        }
      }
    }

    // 3. Check local ledger items
    for (const item of state.ledger) {
      if (item.overdue && item.amount > 0 && item.dueDate) {
        const dueTime = new Date(item.dueDate).getTime();
        const isThirtyDays = !isNaN(dueTime) ? (now - dueTime) >= thirtyDaysMs : true;
        if (isThirtyDays && !countedIds.has(item.id) && !countedIds.has(item.name.toLowerCase())) {
          count++;
          total += item.amount;
          countedIds.add(item.id);
        }
      }
    }

    return { overdue30DaysCount: count, overdue30DaysTotal: total };
  }, [transactions, state.invoices, state.ledger]);

  const value = useMemo(() => ({
    receivables,
    payables,
    netCashFlow,
    runwayMonths: runwayMonthsNum,
    runwayMonthsFormatted,
    runwayStatus,
    transactions,
    snapshots,
    overdue30DaysCount,
    overdue30DaysTotal,
    loading,
    refreshFinancials
  }), [
    receivables,
    payables,
    netCashFlow,
    runwayMonthsNum,
    runwayMonthsFormatted,
    runwayStatus,
    transactions,
    snapshots,
    overdue30DaysCount,
    overdue30DaysTotal,
    loading,
    refreshFinancials
  ]);

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancials = (): FinancialContextType => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error("useFinancials must be used within a FinancialProvider");
  }
  return context;
};
