import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import Card from '../UI/Card';
import Button from '../UI/Button';

interface Holding {
  symbol?: string;
  name?: string;
  allocation?: number;
  shares?: number;
  currentPrice?: number;
}

interface Props {
  holdings: Holding[];
}

const sentimentClass = (label: string) => {
  switch (label) {
    case 'positive': return 'text-green-700 bg-green-100';
    case 'negative': return 'text-red-700 bg-red-100';
    default: return 'text-gray-700 bg-gray-100';
  }
};

const PortfolioSentiment: React.FC<Props> = ({ holdings }) => {
  const [sentiments, setSentiments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainMsg, setTrainMsg] = useState<string | null>(null);

  const loadSentiments = async () => {
    if (!holdings || holdings.length === 0) return;
    setLoading(true);
    try {
      const top = holdings
        .filter(h => !!h.symbol)
        .slice(0, 10);
      const results = await Promise.all(top.map(async (h) => {
        try {
          const data = await apiService.getSymbolSentiment(h.symbol as string);
          return [h.symbol as string, data] as const;
        } catch {
          return [h.symbol as string, { combined_sentiment: 'neutral', confidence: 0 }] as const;
        }
      }));
      const map: Record<string, any> = {};
      results.forEach(([sym, data]) => { map[sym] = data; });
      setSentiments(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSentiments();
  }, [holdings]);

  const topSymbols = useMemo(() => {
    const sorted = [...(holdings || [])].sort((a, b) => (b.shares || 0) * (b.currentPrice || 0) - (a.shares || 0) * (a.currentPrice || 0));
    const uniq: string[] = [];
    for (const h of sorted) {
      const sym = (h.symbol || '').toUpperCase();
      if (!sym) continue;
      if (!uniq.includes(sym)) uniq.push(sym);
      if (uniq.length >= 7) break;
    }
    return uniq;
  }, [holdings]);

  const handleTrain = async () => {
    try {
      setTraining(true);
      setTrainMsg(null);
      const resp = await apiService.trainSentiment(topSymbols);
      setTrainMsg(resp?.success ? 'Training started' : 'Training request sent');
      // Optionally reload sentiments shortly after triggering training
      setTimeout(() => { loadSentiments(); }, 1500);
    } catch (e: any) {
      setTrainMsg(e?.message || 'Failed to start training');
    } finally {
      setTraining(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Portfolio Sentiment</h3>
        <div className="flex items-center gap-3">
          {trainMsg && <span className="text-xs text-gray-500">{trainMsg}</span>}
          <Button variant="outline" onClick={loadSentiments}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button variant="outline" onClick={handleTrain}>
            {training ? 'Training…' : 'Train'}
          </Button>
          {loading && <span className="text-xs text-gray-500">Loading…</span>}
        </div>
      </div>
      {(!holdings || holdings.length === 0) ? (
        <div className="text-sm text-gray-500">No holdings available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {holdings.slice(0, 10).map((h, idx) => {
            const sym = h.symbol || `SYM${idx}`;
            const s = sentiments[sym] || {};
            const label = s.combined_sentiment || s.sentiment || 'neutral';
            const conf = typeof s.confidence === 'number' ? (s.confidence > 1 ? Math.round(s.confidence) : Math.round(s.confidence * 100)) : 0;
            return (
              <div key={sym} className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                    {sym.slice(0, 4)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{sym}</span>
                    <span className="text-xs text-gray-500">{h.name || ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentClass(label)}`}>{label}</span>
                  <span className="text-[10px] text-gray-500">{conf}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default PortfolioSentiment;


