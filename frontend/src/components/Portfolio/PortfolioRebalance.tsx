import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import Card from '../UI/Card';

interface Holding { symbol?: string; type?: string; value?: number; allocation?: number; shares?: number; currentPrice?: number }

interface Props {
  holdings: Holding[];
  riskTolerance: 'conservative'|'moderate'|'aggressive';
}

const PortfolioRebalance: React.FC<Props> = ({ holdings, riskTolerance }) => {
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const symbols = useMemo(() => {
    const sorted = [...(holdings || [])].sort((a, b) => (b.value || 0) - (a.value || 0));
    const unique: string[] = [];
    for (const h of sorted) {
      const sym = (h.symbol || '').toUpperCase().trim();
      if (!sym) continue;
      if (!/^[A-Z.\-]+$/.test(sym)) continue;
      if (!unique.includes(sym)) unique.push(sym);
      if (unique.length >= 5) break;
    }
    return unique;
  }, [holdings]);

  useEffect(() => {
    const load = async () => {
      if (symbols.length < 2) {
        setTargets({});
        setError('Need at least two valid holdings to compute targets');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getPortfolioOptimization(symbols, riskTolerance);
        const w = data?.weights || {};
        if (!w || Object.keys(w).length === 0) {
          setError('No targets returned by optimizer');
          setTargets({});
        } else {
          setTargets(w);
        }
      } catch (e: any) {
        // Fallback: equal-weight targets if optimizer fails
        const n = symbols.length;
        const eq: Record<string, number> = {};
        if (n >= 2) {
          const w = 1 / n;
          symbols.forEach(s => { eq[s] = w; });
          setTargets(eq);
          setError('Optimizer unavailable. Showing equal-weight targets.');
        } else {
          setTargets({});
          setError(e?.message || 'Failed to load targets');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [symbols.join(','), riskTolerance]);

  const rows = useMemo(() => {
    const total = (holdings || []).reduce((sum, h) => sum + (h.value || 0), 0);
    return (holdings || []).map(h => {
      const sym = (h.symbol || '').toUpperCase();
      const currentPct = total > 0 ? ((h.value || 0) / total) * 100 : (h.allocation || 0);
      const hasTarget = Object.prototype.hasOwnProperty.call(targets, sym);
      const targetPct = hasTarget ? (targets[sym] || 0) * 100 : undefined;
      const diff = targetPct !== undefined ? targetPct - currentPct : undefined;
      return { sym, currentPct, targetPct, diff };
    }).filter(r => r.sym);
  }, [holdings, targets]);

  const significant = rows.filter(r => Math.abs(r.diff) > 1).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rebalance Targets</h3>
        {loading && <span className="text-xs text-gray-500">Optimizing…</span>}
      </div>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">No holdings available.</div>
      ) : (
        <div className="space-y-2">
          {(!targets || Object.keys(targets).length === 0) && !loading && (
            <div className="text-sm text-gray-500">No targets available. {error ? '' : 'Try again later or adjust holdings.'}</div>
          )}
          {significant.length === 0 && targets && Object.keys(targets).length > 0 && (
            <div className="text-sm text-gray-500">Portfolio is close to target allocation.</div>
          )}
          {significant.map((r) => (
            <div key={r.sym} className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">{r.sym.slice(0,4)}</div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.sym}</span>
                  <span className="text-xs text-gray-500">Current {r.currentPct.toFixed(1)}% → Target {r.targetPct !== undefined ? r.targetPct.toFixed(1) : '—'}%</span>
                </div>
              </div>
              {r.diff !== undefined ? (
                <div className={`text-sm font-semibold ${r.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {r.diff > 0 ? `Buy ${r.diff.toFixed(1)}%` : `Sell ${Math.abs(r.diff).toFixed(1)}%`}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No target</div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default PortfolioRebalance;


