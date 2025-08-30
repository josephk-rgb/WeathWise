import { Router } from 'express';
import { GoalController } from '../controllers/goalController';

const router = Router();

// Get all goals for a user
router.get('/', GoalController.getGoals);

// Create new goal
router.post('/', GoalController.createGoal);

// Get specific goal
router.get('/:id', GoalController.getGoal);

// Update goal
router.put('/:id', GoalController.updateGoal);

// Delete goal
router.delete('/:id', GoalController.deleteGoal);

// Update goal progress
router.patch('/:id/progress', GoalController.updateGoalProgress);

// Get goal statistics
router.get('/stats/summary', GoalController.getGoalStats);

export default router;
    category: 'Home Purchase',
    priority: 'high',
    currency: 'USD',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Get all goals for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const userGoals = goalsStore.filter(goal => goal.userId === userId);
    
    logger.info(`Retrieved ${userGoals.length} goals for user ${userId}`);
    res.json(userGoals);
  } catch (error) {
    logger.error('Error getting goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new goal
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const {
      title,
      description,
      targetAmount,
      currentAmount = 0,
      targetDate,
      category,
      priority = 'medium',
      currency = 'USD'
    } = req.body;

    // Validation
    if (!title || !targetAmount || !targetDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, targetAmount, targetDate' 
      });
    }

    const newGoal: Goal = {
      id: uuidv4(),
      userId,
      title,
      description: description || '',
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount),
      targetDate: new Date(targetDate),
      category: category || 'Other',
      priority,
      currency,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    goalsStore.push(newGoal);
    
    logger.info(`Created new goal ${newGoal.id} for user ${userId}`);
    res.status(201).json(newGoal);
  } catch (error) {
    logger.error('Error creating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific goal
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const goalId = req.params.id;
    
    const goal = goalsStore.find(g => g.id === goalId && g.userId === userId);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    logger.info(`Retrieved goal ${goalId} for user ${userId}`);
    res.json(goal);
  } catch (error) {
    logger.error('Error getting goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update goal
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const goalId = req.params.id;
    
    const goalIndex = goalsStore.findIndex(g => g.id === goalId && g.userId === userId);
    
    if (goalIndex === -1) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    const {
      title,
      description,
      targetAmount,
      currentAmount,
      targetDate,
      category,
      priority,
      currency
    } = req.body;

    // Update goal
    const updatedGoal = {
      ...goalsStore[goalIndex],
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(targetAmount && { targetAmount: Number(targetAmount) }),
      ...(currentAmount !== undefined && { currentAmount: Number(currentAmount) }),
      ...(targetDate && { targetDate: new Date(targetDate) }),
      ...(category && { category }),
      ...(priority && { priority }),
      ...(currency && { currency }),
      updatedAt: new Date(),
    };
    
    goalsStore[goalIndex] = updatedGoal;
    
    logger.info(`Updated goal ${goalId} for user ${userId}`);
    res.json(updatedGoal);
  } catch (error) {
    logger.error('Error updating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete goal
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID for now
    const goalId = req.params.id;
    
    const goalIndex = goalsStore.findIndex(g => g.id === goalId && g.userId === userId);
    
    if (goalIndex === -1) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    goalsStore.splice(goalIndex, 1);
    
    logger.info(`Deleted goal ${goalId} for user ${userId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
