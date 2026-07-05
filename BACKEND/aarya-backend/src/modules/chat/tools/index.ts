import { getCashFlow } from './getCashFlow';
import { getReceivables } from './getReceivables';
import { getPayables } from './getPayables';
import { getFounderSummary } from './getFounderSummary';
import { searchDecisionMemory } from './searchDecisionMemory';
import { getRunway } from './getRunway';

export {
  getCashFlow,
  getReceivables,
  getPayables,
  getFounderSummary,
  searchDecisionMemory,
  getRunway,
};

export const allTools = [
  getCashFlow,
  getReceivables,
  getPayables,
  getFounderSummary,
  searchDecisionMemory,
  getRunway,
];

export const toolsMap = allTools.reduce((acc, tool) => {
  acc[tool.name] = tool;
  return acc;
}, {} as Record<string, any>);
