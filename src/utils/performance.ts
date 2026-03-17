// Re-export everything from the split modules so existing imports continue to work.
export {
  scoreToBand,
  offsetDate,
  getWeekdaysInRange,
  computeScore,
  managerForEmployee,
  computeMetrics,
  computeEmployeePerformance,
  computeSubadminPerformance,
} from './performance/index';
