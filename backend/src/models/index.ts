// Export all models
export { User, type IUser, type IUserProfile, type IUserPreferences, type IRiskProfile, type ISubscription, type IEncryption, type IUserMetadata } from './User';
export { Account, type IAccount, type IAccountProvider, type IAccountInfo, type IConnectionStatus } from './Account';
export { Transaction, type ITransaction, type ITransactionInfo, type ICategorization, type ILocation, type ITransactionMetadata, type ITransactionAudit } from './Transaction';
export { Investment, type IInvestment, type ISecurityInfo, type IPosition, type IAcquisition, type IAnalytics, type IAlert } from './Investment';

// Re-export mongoose for convenience
export { mongoose } from 'mongoose';
