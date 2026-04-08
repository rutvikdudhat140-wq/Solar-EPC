declare module 'date-fns' {
  export function startOfDay(date: Date | number): Date;
  export function endOfDay(date: Date | number): Date;
  export function startOfMonth(date: Date | number): Date;
  export function endOfMonth(date: Date | number): Date;
  export function subDays(date: Date | number, amount: number): Date;
  export function subMonths(date: Date | number, amount: number): Date;
}
