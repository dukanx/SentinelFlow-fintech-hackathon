import { useEffect, useMemo, useState } from "react";
import type { Deposit } from "@/lib/mock-data";
import {
  buildSeedAlerts,
  computeHeroMetrics,
  nextSyntheticAlert,
  type OpsAlert,
} from "@/lib/demo-ops-metrics";
import { DEMO_LIVE_TICK_MS } from "@/lib/config";
import { HeroMetrics } from "./HeroMetrics";
import { AlertFeed } from "./AlertFeed";

interface Props {
  deposits: Deposit[];
  onOpenCase: (caseId: string) => void;
}

export function CommandCenter({ deposits, onOpenCase }: Props) {
  const [jitter, setJitter] = useState(0);
  const [liveAlerts, setLiveAlerts] = useState<OpsAlert[]>([]);

  const metrics = useMemo(() => computeHeroMetrics(deposits, jitter), [deposits, jitter]);
  const alerts = useMemo(
    () => [...liveAlerts, ...buildSeedAlerts(deposits)],
    [deposits, liveAlerts],
  );

  useEffect(() => {
    const metricsTimer = setInterval(() => {
      setJitter((j) => (j + 1) % 5);
    }, 10_000);

    const alertTimer = setInterval(() => {
      setLiveAlerts((prev) => [nextSyntheticAlert(), ...prev].slice(0, 5));
    }, DEMO_LIVE_TICK_MS);

    return () => {
      clearInterval(metricsTimer);
      clearInterval(alertTimer);
    };
  }, []);

  return (
    <div className="space-y-5">
      <HeroMetrics metrics={metrics} />
      <AlertFeed alerts={alerts} onOpenCase={onOpenCase} />
      <p className="text-xs text-muted-foreground text-center">
        Single-chain Solana demo — production monitors multi-chain jump services (roadmap).
      </p>
    </div>
  );
}
