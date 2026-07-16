import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { BusinessState } from "../types";
import { getTransactions } from "../services/apiClient";

export interface FinancialContextType {
  receivables: number;
  payables: number;
  netCashFlow: number;
  runwayMonths: number;
  runwayMonthsFormatted: string;
  runwayStatus: "SECURE" | "WARNING" | "CRITICAL";
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
  const [loading, setLoading] = useState<boolean>(true);

  // Keep local state in sync if API hasn't loaded or when ledger changes directly
  useEffect(() => {
    if (!loading && receivables === 0 && ledgerReceivables > 0) {
      setReceivables(ledgerReceivables);
    }
    if (!loading && payables === 0 && ledgerPayables > 0) {
      setPayables(ledgerPayables);
    }
  }, [ledgerReceivables, ledgerPayables, loading, receivables, payables]);

  const refreshFinancials = useCallback(async () => {
    setLoading(true);
    try {
      const [incomeRes, expenseRes] = await Promise.all([
        getTransactions({ transaction_type: "income", limit: 500 }) as Promise<any>,
        getTransactions({ transaction_type: "expense", limit: 500 }) as Promise<any>,
      ]);

      const incomeTotal = (incomeRes?.data?.data ?? []).reduce(
        (sum: number, tx: any) => sum + Math.abs(Number(tx.amount) || 0), 0
      );
      const expenseTotal = (expenseRes?.data?.data ?? []).reduce(
        (sum: number, tx: any) => sum + Math.abs(Number(tx.amount) || 0), 0
      );

      setReceivables(incomeTotal > 0 ? incomeTotal : ledgerReceivables);
      setPayables(expenseTotal > 0 ? expenseTotal : ledgerPayables);
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

  const value = useMemo(() => ({
    receivables,
    payables,
    netCashFlow,
    runwayMonths: runwayMonthsNum,
    runwayMonthsFormatted,
    runwayStatus,
    loading,
    refreshFinancials
  }), [
    receivables,
    payables,
    netCashFlow,
    runwayMonthsNum,
    runwayMonthsFormatted,
    runwayStatus,
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
