import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

const router = Router();

// Mock data store (in a real app, this would be a database)
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: Date;
  currency: string;
  originalCurrency?: string;
  originalAmount?: number;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage (replace with database)
const transactionsStore: Transaction[] = [
  {
    id: '1',
    userId: 'user123',
    amount: 3500,
    description: 'Salary',
    category: 'Salary',
    type: 'income',
    date: new Date('2024-08-01'),
    currency: 'USD',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-08-01'),
  },
  {
    id: '2',
    userId: 'user123',
    amount: -1200,
    description: 'Rent payment',
    category: 'Housing',
    type: 'expense',
    date: new Date('2024-08-01'),
    currency: 'USD',
    isRecurring: true,
    recurringFrequency: 'monthly',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-08-01'),
  },
  {
    id: '3',
    userId: 'user123',
    amount: -85.50,
    description: 'Grocery shopping',
    category: 'Food',
    type: 'expense',
    date: new Date('2024-08-15'),
    currency: 'USD',
    tags: ['weekly', 'essentials'],
    createdAt: new Date('2024-08-15'),
    updatedAt: new Date('2024-08-15'),
  },
  {
    id: '4',
    userId: 'user123',
    amount: -450,
    description: 'Car insurance',
    category: 'Transportation',
    type: 'expense',
    date: new Date('2024-08-10'),
    currency: 'USD',
    isRecurring: true,
    recurringFrequency: 'monthly',
    createdAt: new Date('2024-08-10'),
    updatedAt: new Date('2024-08-10'),
  },
  {
    id: '5',
    userId: 'user123',
    amount: 2500,
    description: 'Freelance project',
    category: 'Freelance',
    type: 'income',
    date: new Date('2024-08-20'),
    currency: 'USD',
    createdAt: new Date('2024-08-20'),
    updatedAt: new Date('2024-08-20'),
  },
];

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const { 
      category, 
      type, 
      startDate, 
      endDate, 
      limit = 50, 
      offset = 0,
      search 
    } = req.query;

    let userTransactions = transactionsStore.filter(t => t.userId === userId);

    // Apply filters
    if (category && category !== 'all') {
      userTransactions = userTransactions.filter(t => 
        t.category.toLowerCase() === (category as string).toLowerCase()
      );
    }

    if (type && type !== 'all') {
      userTransactions = userTransactions.filter(t => t.type === type);
    }

    if (startDate) {
      userTransactions = userTransactions.filter(t => 
        new Date(t.date) >= new Date(startDate as string)
      );
    }

    if (endDate) {
      userTransactions = userTransactions.filter(t => 
        new Date(t.date) <= new Date(endDate as string)
      );
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      userTransactions = userTransactions.filter(t =>
        t.description.toLowerCase().includes(searchTerm) ||
        t.category.toLowerCase().includes(searchTerm) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }

    // Sort by date (newest first)
    userTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedTransactions = userTransactions.slice(offsetNum, offsetNum + limitNum);

    logger.info(`Retrieved ${paginatedTransactions.length} transactions for user ${userId}`);
    res.json({
      transactions: paginatedTransactions,
      total: userTransactions.length,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    logger.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new transaction
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const {
      amount,
      description,
      category,
      type,
      date,
      currency = 'USD',
      receiptUrl,
      isRecurring = false,
      recurringFrequency,
      tags
    } = req.body;

    // Validation
    if (!amount || !description || !category || !type || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, description, category, type, date' 
      });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be either "income" or "expense"' 
      });
    }

    const newTransaction: Transaction = {
      id: uuidv4(),
      userId,
      amount: Number(amount),
      description,
      category,
      type,
      date: new Date(date),
      currency,
      ...(receiptUrl && { receiptUrl }),
      isRecurring,
      ...(recurringFrequency && { recurringFrequency }),
      ...(tags && { tags }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    transactionsStore.push(newTransaction);
    
    logger.info(`Created new transaction ${newTransaction.id} for user ${userId}`);
    res.status(201).json(newTransaction);
  } catch (error) {
    logger.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific transaction
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const transactionId = req.params.id;
    
    const transaction = transactionsStore.find(t => t.id === transactionId && t.userId === userId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    logger.info(`Retrieved transaction ${transactionId} for user ${userId}`);
    res.json(transaction);
  } catch (error) {
    logger.error('Error getting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transaction
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const transactionId = req.params.id;
    
    const transactionIndex = transactionsStore.findIndex(t => t.id === transactionId && t.userId === userId);
    
    if (transactionIndex === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const {
      amount,
      description,
      category,
      type,
      date,
      currency,
      receiptUrl,
      isRecurring,
      recurringFrequency,
      tags
    } = req.body;

    // Update transaction
    const updatedTransaction = {
      ...transactionsStore[transactionIndex],
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(description && { description }),
      ...(category && { category }),
      ...(type && { type }),
      ...(date && { date: new Date(date) }),
      ...(currency && { currency }),
      ...(receiptUrl !== undefined && { receiptUrl }),
      ...(isRecurring !== undefined && { isRecurring }),
      ...(recurringFrequency !== undefined && { recurringFrequency }),
      ...(tags !== undefined && { tags }),
      updatedAt: new Date(),
    };
    
    transactionsStore[transactionIndex] = updatedTransaction;
    
    logger.info(`Updated transaction ${transactionId} for user ${userId}`);
    res.json(updatedTransaction);
  } catch (error) {
    logger.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const transactionId = req.params.id;
    
    const transactionIndex = transactionsStore.findIndex(t => t.id === transactionId && t.userId === userId);
    
    if (transactionIndex === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    transactionsStore.splice(transactionIndex, 1);
    
    logger.info(`Deleted transaction ${transactionId} for user ${userId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export transactions
router.get('/export', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const { format = 'csv' } = req.query;
    
    const userTransactions = transactionsStore.filter(t => t.userId === userId);
    
    if (format === 'csv') {
      // Generate CSV
      const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency'];
      const csvRows = [
        headers.join(','),
        ...userTransactions.map(t => [
          t.date.toISOString().split('T')[0],
          `"${t.description}"`,
          t.category,
          t.type,
          t.amount,
          t.currency
        ].join(','))
      ];
      
      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      res.send(csvContent);
    } else {
      res.status(400).json({ error: 'Unsupported export format' });
    }
    
    logger.info(`Exported ${userTransactions.length} transactions for user ${userId}`);
  } catch (error) {
    logger.error('Error exporting transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

