import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { Debt, IDebt, IDebtPayment } from '../../models/Debt';
import { MockDataHelpers } from '../../utils/MockDataHelpers';

export interface DebtGenerationConfig {
  userId: mongoose.Types.ObjectId;
  numberOfDebts: number;
  generatePaymentHistory: boolean;
}

export class DebtMockGenerator {
  static async generateDebtsForUser(config: DebtGenerationConfig): Promise<IDebt[]> {
    const debts: IDebt[] = [];
    
    try {
      // Clear existing debts for this user first
      await Debt.deleteMany({ userId: config.userId });
      
      // Generate the specified number of debts
      for (let i = 0; i < config.numberOfDebts; i++) {
        const debt = await this.createSingleDebt(config.userId, config.generatePaymentHistory);
        debts.push(debt);
      }
      
      console.log(`Generated ${debts.length} debts for admin user`);
      return debts;
    } catch (error) {
      console.error('Error generating debts:', error);
      throw error;
    }
  }

  private static async createSingleDebt(
    userId: mongoose.Types.ObjectId,
    generatePaymentHistory: boolean
  ): Promise<IDebt> {
    
    const debtType = MockDataHelpers.generateDebtType();
    const debtTemplate = this.getDebtTemplate(debtType);
    
    const totalAmount = this.generateDebtAmount(debtType);
    const interestRate = this.generateInterestRate(debtType);
    const minimumPayment = this.calculateMinimumPayment(totalAmount, interestRate, debtType);
    const paymentHistory = generatePaymentHistory ? this.generatePaymentHistory(minimumPayment) : [];
    
    // Calculate remaining balance based on payment history
    const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingBalance = Math.max(0, totalAmount - totalPaid);
    
    // Determine if debt is paid off
    const isPaidOff = remainingBalance === 0;
    const paidOffAt = isPaidOff ? faker.date.recent({ days: 30 }) : undefined;

    const debtData = {
      userId,
      name: debtTemplate.name,
      totalAmount,
      remainingBalance,
      interestRate,
      minimumPayment,
      dueDate: this.generateDueDate(),
      type: debtType,
      currency: 'USD',
      paymentHistory,
      isActive: !isPaidOff,
      isPaidOff,
      paidOffAt
    };

    const debt = new Debt(debtData);
    return await debt.save();
  }

  private static getDebtTemplate(debtType: string) {
    const templates: { [key: string]: { name: string } } = {
      'credit_card': {
        name: faker.helpers.arrayElement([
          'Chase Sapphire Credit Card',
          'Capital One Venture Card',
          'Discover Cashback Card',
          'American Express Gold Card',
          'Citi Double Cash Card',
          'Bank of America Cash Rewards'
        ])
      },
      'student_loan': {
        name: faker.helpers.arrayElement([
          'Federal Student Loan',
          'Graduate School Loan',
          'Undergraduate Loan',
          'Private Student Loan',
          'Sallie Mae Student Loan'
        ])
      },
      'mortgage': {
        name: faker.helpers.arrayElement([
          'Home Mortgage',
          'Primary Residence Mortgage',
          'Conventional Mortgage',
          'FHA Mortgage',
          '30-Year Fixed Mortgage'
        ])
      },
      'loan': {
        name: faker.helpers.arrayElement([
          'Personal Loan',
          'Auto Loan',
          'Home Equity Loan',
          'Consolidation Loan',
          'Equipment Loan'
        ])
      },
      'other': {
        name: faker.helpers.arrayElement([
          'Medical Debt',
          'Tax Debt',
          'Family Loan',
          'Business Loan',
          'Line of Credit'
        ])
      }
    };

    return templates[debtType] || { name: 'Debt Account' };
  }

  private static generateDebtAmount(debtType: string): number {
    // Realistic debt amounts by type
    const amountRanges: { [key: string]: { min: number; max: number } } = {
      'credit_card': { min: 1000, max: 25000 },
      'student_loan': { min: 15000, max: 80000 },
      'mortgage': { min: 150000, max: 600000 },
      'loan': { min: 5000, max: 50000 }, // Personal/auto loans
      'other': { min: 2000, max: 15000 }
    };

    const range = amountRanges[debtType] || { min: 5000, max: 25000 };
    return parseFloat(faker.finance.amount(range.min, range.max, 0));
  }

  private static generateInterestRate(debtType: string): number {
    // Realistic interest rates by debt type
    const rateRanges: { [key: string]: { min: number; max: number } } = {
      'credit_card': { min: 15.0, max: 29.0 },
      'student_loan': { min: 4.0, max: 8.0 },
      'mortgage': { min: 3.0, max: 7.0 },
      'loan': { min: 6.0, max: 18.0 }, // Personal/auto loans
      'other': { min: 5.0, max: 15.0 }
    };

    const range = rateRanges[debtType] || { min: 5.0, max: 15.0 };
    return parseFloat(faker.number.float({ min: range.min, max: range.max }).toFixed(2));
  }

  private static calculateMinimumPayment(
    totalAmount: number,
    interestRate: number,
    debtType: string
  ): number {
    let payment: number;

    switch (debtType) {
      case 'credit_card':
        // Credit cards typically require 2-3% of balance
        payment = totalAmount * faker.number.float({ min: 0.02, max: 0.03 });
        break;
      case 'mortgage':
        // Calculate approximate mortgage payment (simplified)
        const monthlyRate = interestRate / 100 / 12;
        const numPayments = 30 * 12; // 30 years
        payment = totalAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                 (Math.pow(1 + monthlyRate, numPayments) - 1);
        break;
      case 'student_loan':
        // Standard 10-year repayment
        const studentMonthlyRate = interestRate / 100 / 12;
        const studentPayments = 10 * 12;
        payment = totalAmount * (studentMonthlyRate * Math.pow(1 + studentMonthlyRate, studentPayments)) / 
                 (Math.pow(1 + studentMonthlyRate, studentPayments) - 1);
        break;
      default:
        // Personal loans, typically 3-7 years
        const loanMonthlyRate = interestRate / 100 / 12;
        const loanPayments = faker.number.int({ min: 36, max: 84 }); // 3-7 years
        payment = totalAmount * (loanMonthlyRate * Math.pow(1 + loanMonthlyRate, loanPayments)) / 
                 (Math.pow(1 + loanMonthlyRate, loanPayments) - 1);
    }

    return parseFloat(payment.toFixed(2));
  }

  private static generateDueDate(): Date {
    // Generate due date within the next month
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(faker.number.int({ min: 1, max: 28 })); // Avoid month-end issues
    return dueDate;
  }

  private static generatePaymentHistory(minimumPayment: number): IDebtPayment[] {
    const payments: IDebtPayment[] = [];
    const numberOfPayments = faker.number.int({ min: 0, max: 24 }); // 0-24 months of history
    
    for (let i = 0; i < numberOfPayments; i++) {
      const paymentDate = new Date();
      paymentDate.setMonth(paymentDate.getMonth() - i);
      
      // Generate payment amount (can be minimum, more than minimum, or occasionally less)
      let paymentAmount: number;
      const paymentType = faker.number.float();
      
      if (paymentType < 0.6) {
        // 60% pay exactly minimum
        paymentAmount = minimumPayment;
      } else if (paymentType < 0.85) {
        // 25% pay more than minimum
        paymentAmount = minimumPayment * faker.number.float({ min: 1.1, max: 3.0 });
      } else {
        // 15% pay less than minimum (missed or partial payments)
        paymentAmount = minimumPayment * faker.number.float({ min: 0.0, max: 0.9 });
      }

      payments.push({
        amount: parseFloat(paymentAmount.toFixed(2)),
        paymentDate,
        currency: 'USD'
      });
    }

    // Sort payments by date (oldest first)
    return payments.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
  }

  // Helper methods for configuration
  static getDefaultNumberOfDebts(): number {
    return faker.number.int({ min: 2, max: 6 });
  }

  // Calculate debt statistics
  static calculateDebtMetrics(debts: IDebt[]) {
    const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingBalance, 0);
    const totalOriginalDebt = debts.reduce((sum, debt) => sum + debt.totalAmount, 0);
    const totalMinimumPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    const activeDebts = debts.filter(debt => debt.isActive).length;
    const paidOffDebts = debts.filter(debt => debt.isPaidOff).length;
    
    const debtByType = debts.reduce((acc, debt) => {
      acc[debt.type] = (acc[debt.type] || 0) + debt.remainingBalance;
      return acc;
    }, {} as { [key: string]: number });

    const averageInterestRate = debts.length > 0
      ? debts.reduce((sum, debt) => sum + debt.interestRate, 0) / debts.length
      : 0;

    const totalPaid = totalOriginalDebt - totalDebt;
    const payoffProgress = totalOriginalDebt > 0 ? (totalPaid / totalOriginalDebt) * 100 : 0;

    return {
      totalDebts: debts.length,
      activeDebts,
      paidOffDebts,
      totalDebt,
      totalOriginalDebt,
      totalPaid,
      payoffProgress,
      totalMinimumPayments,
      averageInterestRate,
      debtByType
    };
  }

  // Generate debt payoff strategy
  static generatePayoffStrategy(debts: IDebt[]) {
    const activeDebts = debts.filter(debt => debt.isActive);
    
    // Debt Avalanche (highest interest first)
    const avalancheOrder = [...activeDebts].sort((a, b) => b.interestRate - a.interestRate);
    
    // Debt Snowball (smallest balance first)
    const snowballOrder = [...activeDebts].sort((a, b) => a.remainingBalance - b.remainingBalance);

    const strategies = {
      avalanche: {
        name: 'Debt Avalanche',
        description: 'Pay minimums on all debts, then focus extra payments on highest interest rate debt',
        order: avalancheOrder.map(debt => ({
          name: debt.name,
          balance: debt.remainingBalance,
          interestRate: debt.interestRate,
          minimumPayment: debt.minimumPayment
        })),
        estimatedInterestSaved: this.calculateInterestSavings(avalancheOrder, 'avalanche')
      },
      snowball: {
        name: 'Debt Snowball',
        description: 'Pay minimums on all debts, then focus extra payments on smallest balance debt',
        order: snowballOrder.map(debt => ({
          name: debt.name,
          balance: debt.remainingBalance,
          interestRate: debt.interestRate,
          minimumPayment: debt.minimumPayment
        })),
        estimatedInterestSaved: this.calculateInterestSavings(snowballOrder, 'snowball')
      }
    };

    return strategies;
  }

  private static calculateInterestSavings(debts: IDebt[], strategy: string): number {
    // Simplified interest savings calculation
    // In reality, this would require complex amortization calculations
    const totalBalance = debts.reduce((sum, debt) => sum + debt.remainingBalance, 0);
    const averageRate = debts.reduce((sum, debt) => sum + debt.interestRate, 0) / debts.length;
    
    // Estimate based on strategy effectiveness
    const savingsMultiplier = strategy === 'avalanche' ? 0.15 : 0.08; // Avalanche typically saves more
    return totalBalance * (averageRate / 100) * savingsMultiplier;
  }
}
