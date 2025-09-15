import { Types } from 'mongoose';
import { AIServiceManager } from './aiServiceManager';
import { Recommendation, IRecommendation } from '../models';

type RecommendationScope = 'dashboard' | 'portfolio';

interface GenerateOptions {
  userId: string;
  scope: RecommendationScope;
  max?: number;
  portfolioData?: any;
  authToken?: string;
}

export class RecommendationService {
  private ai: AIServiceManager;

  constructor() {
    this.ai = new AIServiceManager();
  }

  async refreshRecommendations(options: GenerateOptions): Promise<{ created: number; items: IRecommendation[] }>{
    const { userId, scope, max = 5, portfolioData, authToken } = options;

    // Simple freshness gate: if we already have fresh items in the last 2 minutes, skip
    const freshCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const recent = await Recommendation.find({
      userId: new Types.ObjectId(userId),
      'metadata.category': scope,
      createdAt: { $gte: freshCutoff }
    }).lean();

    if (recent.length > 0) {
      return { created: 0, items: [] as any };
    }

    // Call ML service (Ollama behind the Python service)
    let response: any;
    try {
      // Prefer dedicated ML recommendations endpoint if available
      const axios = (await import('axios')).default;
      const mlBase = process.env['PYTHON_ML_SERVICE_URL'] || process.env['ML_SERVICE_URL'] || 'http://localhost:8000';
      const { data } = await axios.post(`${mlBase}/api/ml/recommendations/generate`, {
        user_id: userId,
        scope,
        max,
        portfolio: scope === 'portfolio' ? portfolioData : undefined
      }, {
        timeout: 60000,
        headers: this.buildAuthHeaders(authToken)
      });
      response = { recommendations: data?.recommendations || [] };
    } catch (err) {
      // Fallback: only if there are no recent recommendations at all
      const existing = await Recommendation.find({
        userId: new Types.ObjectId(userId),
        'metadata.category': scope
      }).sort({ createdAt: -1 }).limit(1).lean();

      if (existing.length > 0) {
        return { created: 0, items: [] as any };
      }

      const fb = this.ai.generateFallbackResponse('recommendations', { portfolio: portfolioData });
      response = { recommendations: fb.recommendations };
    }

    // Normalize results to an array of recommendation-like objects
    const recsRaw = Array.isArray(response?.recommendations) ? response.recommendations : [];

    const limited = recsRaw.slice(0, Math.max(1, Math.min(5, max)));

    const toDocs: Partial<IRecommendation & { metadata: any }>[] = limited.map((r: any) => {
      // Coerce fields with defensives; confidence 0-100
      const confidencePct = typeof r.confidence === 'number'
        ? (r.confidence <= 1 ? Math.round(r.confidence * 100) : Math.round(r.confidence))
        : 80;

      const description = r.description || (Array.isArray(r.reasoning) ? r.reasoning.join('\n') : undefined) || String(r) || 'Action recommended';
      const derivedTitle = (() => {
        if (typeof r.title === 'string' && r.title.trim().length > 0) return r.title.trim();
        if (typeof r.symbol === 'string' && r.symbol.trim().length > 0) return r.symbol.trim();
        if (typeof description === 'string') {
          const firstLine = description.split(/\n|\.|\!/)[0] || 'Recommendation';
          return firstLine.slice(0, 140).trim() || 'Recommendation';
        }
        return 'Recommendation';
      })();
      const actionItems = Array.isArray(r.actionItems) ? r.actionItems : (r.actions || []);

      // Infer type
      const inferredType: IRecommendation['type'] = scope === 'portfolio' ? 'investment' : (r.type || 'goal');

      // TTL: 45 days by default
      const expiresAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

      return {
        userId: new Types.ObjectId(userId) as any,
        type: inferredType,
        title: derivedTitle,
        description,
        confidence: Math.max(0, Math.min(100, confidencePct)),
        reasoning: Array.isArray(r.reasoning) ? r.reasoning : [],
        actionItems: Array.isArray(actionItems) ? actionItems.slice(0, 8) : [],
        priority: r.priority || 'medium',
        potentialImpact: r.expectedImpact ? {
          financial: typeof r.expectedImpact === 'number' ? r.expectedImpact : undefined,
          timeframe: r.timeHorizon,
          riskLevel: r.riskScore != null ? (r.riskScore > 0.66 ? 'high' : r.riskScore > 0.33 ? 'medium' : 'low') : undefined
        } : undefined,
        isViewed: false,
        expiresAt,
        metadata: {
          category: scope,
          symbol: r.symbol,
          targetAllocation: r.targetAllocation,
          raw: r
        }
      } as any;
    });

    // Dedupe against last 7 days by title + category + description signature
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const created: IRecommendation[] = [] as any;

    for (const doc of toDocs) {
      const signature = `${doc.title}|${(doc as any).description}`.slice(0, 500);
      const exists = await Recommendation.findOne({
        userId: doc.userId,
        title: doc.title,
        'metadata.category': scope,
        createdAt: { $gte: sevenDaysAgo }
      }).lean();

      if (exists) continue;

      try {
        const saved = await Recommendation.create({ ...doc, 'metadata.signature': signature } as any);
        created.push(saved.toJSON() as any);
      } catch (e) {
        // Skip faulty doc and continue
        continue;
      }
    }

    return { created: created.length, items: created };
  }

  private buildAuthHeaders(userAuthToken?: string): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // Prefer end-user token to allow backend-proxy to fetch user-specific context
    if (userAuthToken) {
      headers['Authorization'] = `Bearer ${userAuthToken}`;
      return headers;
    }
    // Fallback to service token if available
    const serviceToken = process.env['SERVICE_AUTH_TOKEN'];
    if (serviceToken) headers['Authorization'] = `Bearer ${serviceToken}`;
    return headers;
  }

  async getRecommendations(userId: string, scope: RecommendationScope, limit = 5): Promise<IRecommendation[]> {
    const query = {
      userId: new Types.ObjectId(userId),
      'metadata.category': scope
    };

    return Recommendation
      .find(query)
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Math.min(20, limit)))
      .lean();
  }
}


