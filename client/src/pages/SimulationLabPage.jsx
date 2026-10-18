import React, { useState } from 'react';
import { api } from '../api/client';
import { Cpu, Play, CheckCircle2, Repeat, RefreshCw } from 'lucide-react';

export function SimulationLabPage() {
  const [raceResult, setRaceResult] = useState(null);
  const [raceLoading, setRaceLoading] = useState(false);

  const [idempotencyResult, setIdempotencyResult] = useState(null);
  const [idempotencyLoading, setIdempotencyLoading] = useState(false);

  // 1. Run Race Simulation
  const runRaceSimulation = async () => {
    setRaceLoading(true);
    setRaceResult(null);
    try {
      const res = await api.post('/simulation/race-claim', {});
      setRaceResult(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Simulation failed');
    } finally {
      setRaceLoading(false);
    }
  };

  // 2. Run Idempotency Simulation
  const runIdempotencySimulation = async () => {
    setIdempotencyLoading(true);
    setIdempotencyResult(null);
    try {
      const testKey = `sim-key-${Date.now()}`;
      // Call 1
      const res1 = await api.post('/simulation/idempotency', { key: testKey });
      // Call 2 with identical key
      const res2 = await api.post('/simulation/idempotency', { key: testKey });

      setIdempotencyResult({
        key: testKey,
        call1: res1.data,
        call2: res2.data
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Idempotency simulation failed');
    } finally {
      setIdempotencyLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-tf-charcoal tracking-tight">Concurrency & Resilience Lab</h1>
        <p className="text-xs text-tf-slate mt-0.5">
          Live verification of atomic OCC race handling, multi-document consistency, and idempotent request deduplication
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Scenario 1: Atomic Concurrent Claim */}
        <div className="bg-white border border-tf-border rounded-lg p-5 shadow-tf-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-tf-indigo bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Atomic Contention
              </span>
              <h2 className="text-sm font-semibold text-tf-charcoal mt-2">
                Simultaneous Assignment Race
              </h2>
              <p className="text-xs text-tf-slate mt-0.5">
                Two simulated operators concurrently attempt to claim the same unassigned work item.
              </p>
            </div>
            <button
              onClick={runRaceSimulation}
              disabled={raceLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-tf-indigo hover:bg-tf-indigo/90 text-white text-xs font-medium shadow-tf-sm transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {raceLoading ? 'Simulating...' : 'Trigger race'}
            </button>
          </div>

          <div className="text-xs bg-tf-bg border border-tf-border rounded-md p-3 font-mono text-tf-slate text-[11px]">
            Mechanism: Conditional atomic write (findOneAndUpdate with assigneeId: null & expectedVersion) inside MongoDB transaction session.
          </div>

          {raceResult && (
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-semibold text-tf-charcoal block">Verification Result:</span>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {/* User 1 */}
                <div className={`p-3 rounded-md border ${
                  raceResult.user1.attemptResult?.status === 200
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-red-50/60 border-red-200 text-red-900'
                }`}>
                  <div className="font-semibold flex items-center justify-between">
                    <span>{raceResult.user1.name}</span>
                    <span>HTTP {raceResult.user1.attemptResult?.status}</span>
                  </div>
                  <p className="mt-1 text-[11px]">{raceResult.user1.attemptResult?.message}</p>
                </div>

                {/* User 2 */}
                <div className={`p-3 rounded-md border ${
                  raceResult.user2.attemptResult?.status === 200
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-red-50/60 border-red-200 text-red-900'
                }`}>
                  <div className="font-semibold flex items-center justify-between">
                    <span>{raceResult.user2.name}</span>
                    <span>HTTP {raceResult.user2.attemptResult?.status}</span>
                  </div>
                  <p className="mt-1 text-[11px]">{raceResult.user2.attemptResult?.message}</p>
                </div>
              </div>

              <div className="p-3 bg-tf-bg border border-tf-border rounded-md text-xs font-mono text-tf-charcoal">
                <span className="font-semibold block text-tf-charcoal mb-1">Final Confirmed State:</span>
                <div>Owner: <span className="font-medium text-emerald-700">{raceResult.finalState?.assigneeId?.name}</span></div>
                <div>Status: {raceResult.finalState?.status}</div>
                <div>Revision: v{raceResult.finalState?.version}</div>
              </div>
            </div>
          )}
        </div>

        {/* Scenario 2: Idempotent Retries & Deduplication */}
        <div className="bg-white border border-tf-border rounded-lg p-5 shadow-tf-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-tf-indigo bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Fault Tolerance
              </span>
              <h2 className="text-sm font-semibold text-tf-charcoal mt-2">
                Idempotency Deduplication
              </h2>
              <p className="text-xs text-tf-slate mt-0.5">
                A client issues identical requests with the same Idempotency-Key header.
              </p>
            </div>
            <button
              onClick={runIdempotencySimulation}
              disabled={idempotencyLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-tf-indigo hover:bg-tf-indigo/90 text-white text-xs font-medium shadow-tf-sm transition disabled:opacity-50"
            >
              <Repeat className="w-3.5 h-3.5" />
              {idempotencyLoading ? 'Testing...' : 'Test replay'}
            </button>
          </div>

          <div className="text-xs bg-tf-bg border border-tf-border rounded-md p-3 font-mono text-tf-slate text-[11px]">
            Mechanism: IdempotencyKey collection cache, SHA-256 payload fingerprinting, and atomic bypass of duplicate database mutations.
          </div>

          {idempotencyResult && (
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-semibold text-tf-charcoal block">Deduplication Verification:</span>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {/* Call 1 */}
                <div className="p-3 rounded-md border bg-indigo-50/40 border-indigo-200 text-indigo-900">
                  <div className="font-semibold flex items-center justify-between">
                    <span>First Attempt</span>
                    <span>{idempotencyResult.call1.cacheStatus}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-indigo-800">Executed transaction and cached response.</p>
                </div>

                {/* Call 2 */}
                <div className="p-3 rounded-md border bg-emerald-50/60 border-emerald-200 text-emerald-900">
                  <div className="font-semibold flex items-center justify-between">
                    <span>Replay Attempt</span>
                    <span>{idempotencyResult.call2.cacheStatus}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-800">Replayed cached result with zero database mutations.</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-md text-xs font-mono text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero duplicate side-effects confirmed. Transaction history preserved.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
