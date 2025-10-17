import { PerformanceMonitor } from '@/lib/performance';

/**
 * Wraps a server action with performance monitoring
 * Usage: export const myAction = withPerformance('myAction', async (data) => { ... });
 */
export function withPerformance<T extends (...args: any[]) => Promise<any>>(
  actionName: string,
  actionFn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return PerformanceMonitor.measure(`action:${actionName}`, () => actionFn(...args));
  }) as T;
}

/**
 * Wraps a database query with performance monitoring
 */
export function withQueryPerformance<T extends (...args: any[]) => Promise<any>>(
  queryName: string,
  queryFn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return PerformanceMonitor.measureQuery(queryName, () => queryFn(...args));
  }) as T;
}
