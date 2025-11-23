/**
 * EMI (Equated Monthly Installment) Calculation Utilities
 */

/**
 * Calculate EMI using the formula:
 * EMI = [P × R × (1+R)^N] / [(1+R)^N - 1]
 * Where:
 * P = Principal loan amount
 * R = Monthly interest rate (annual rate / 12 / 100)
 * N = Number of monthly installments
 */
export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  if (tenureMonths === 0) return principal;
  if (annualInterestRate === 0) return principal / tenureMonths;

  const monthlyRate = annualInterestRate / 12 / 100;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  return Math.round(emi * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate EMI schedule for a loan
 */
export interface EMIScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  remainingPrincipal: number;
}

export function generateEMISchedule(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): EMIScheduleItem[] {
  const monthlyRate = annualInterestRate / 12 / 100;
  const emi = calculateEMI(principal, annualInterestRate, tenureMonths);
  const schedule: EMIScheduleItem[] = [];

  let remainingPrincipal = principal;

  for (let i = 1; i <= tenureMonths; i++) {
    const interestAmount = Math.round(remainingPrincipal * monthlyRate * 100) / 100;
    const principalAmount = Math.round((emi - interestAmount) * 100) / 100;
    const totalAmount = principalAmount + interestAmount;

    // Adjust last installment to account for rounding
    if (i === tenureMonths) {
      const adjustedPrincipal = remainingPrincipal;
      const adjustedTotal = adjustedPrincipal + interestAmount;
      schedule.push({
        installmentNumber: i,
        dueDate: new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate()),
        principalAmount: Math.round(adjustedPrincipal * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        totalAmount: Math.round(adjustedTotal * 100) / 100,
        remainingPrincipal: 0,
      });
    } else {
      remainingPrincipal -= principalAmount;
      schedule.push({
        installmentNumber: i,
        dueDate: new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate()),
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        remainingPrincipal: Math.round(remainingPrincipal * 100) / 100,
      });
    }
  }

  return schedule;
}
