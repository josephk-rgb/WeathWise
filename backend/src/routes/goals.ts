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
