const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { Transaction, User } = require('./dist/models');

async function checkBestMonth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/weathwise');
    console.log('✅ Connected to MongoDB');

    // Get the user with transactions
    const user = await User.findOne({ email: 'test@tpp1235.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`\n🔍 === FINDING BEST MONTH WITH MOST CATEGORIES FOR: ${user.email} ===`);

    const userObjectId = new mongoose.Types.ObjectId(user._id);
    const allTransactions = await Transaction.find({ userId: userObjectId }).lean();
    
    // Group transactions by month
    const transactionsByMonth = allTransactions.reduce((acc, tx) => {
      const date = new Date(tx.transactionInfo?.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push(tx);
      return acc;
    }, {});

    console.log('\n📊 TRANSACTIONS BY MONTH:');
    const monthStats = [];
    
    Object.entries(transactionsByMonth).forEach(([month, transactions]) => {
      const expenses = transactions.filter(t => t.transactionInfo?.type === 'expense');
      const categories = new Set(expenses.map(t => t.transactionInfo?.category));
      
      monthStats.push({
        month,
        totalTransactions: transactions.length,
        expenses: expenses.length,
        categories: categories.size,
        categoryList: Array.from(categories).sort()
      });
      
      console.log(`  ${month}: ${transactions.length} total, ${expenses.length} expenses, ${categories.size} categories`);
      console.log(`    Categories: ${Array.from(categories).sort().join(', ')}`);
    });

    // Find the month with the most categories
    const bestMonth = monthStats.reduce((best, current) => 
      current.categories > best.categories ? current : best
    );

    console.log(`\n🏆 BEST MONTH: ${bestMonth.month}`);
    console.log(`  - Total transactions: ${bestMonth.totalTransactions}`);
    console.log(`  - Expenses: ${bestMonth.expenses}`);
    console.log(`  - Categories: ${bestMonth.categories}`);
    console.log(`  - Category list: ${bestMonth.categoryList.join(', ')}`);

    // Show all months sorted by category count
    console.log('\n📈 MONTHS RANKED BY CATEGORY COUNT:');
    monthStats
      .sort((a, b) => b.categories - a.categories)
      .forEach((month, index) => {
        console.log(`  ${index + 1}. ${month.month}: ${month.categories} categories (${month.categoryList.join(', ')})`);
      });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the check
checkBestMonth();
