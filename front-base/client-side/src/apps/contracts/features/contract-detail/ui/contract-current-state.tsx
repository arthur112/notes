import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { Contract } from "@/shared/domain/contracts";
import { Button } from "@/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Separator } from "@/shared/components/ui/separator";
import { formatCurrency } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { formatDmy, formatPct } from "../lib/format";
import { StatStrip, type Stat } from "./stat-strip";

/** Modifications shown before "View more" — the rest expand in place. */
const VISIBLE_MODIFICATIONS = 3;

type Modification = Contract["current"]["modifications"][number];

function ModificationList({ modifications }: { modifications: Modification[] }) {
  return (
    <ul>
      {modifications.map((mod) => (
        <li
          key={`${mod.date}-${mod.kind}`}
          className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm"
        >
          <time className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatDmy(mod.date)}
          </time>
          <span>
            <span className="font-semibold">{mod.kind}</span>
            <span className="text-muted-foreground">
              {" "}
              — {mod.description} · {mod.agent}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export type ContractCurrentStateProps = {
  contract: Contract;
  onOpenClaimFile: (claimNo: string) => void;
};

/**
 * The "Current state" section: the live snapshot (remaining term, outstanding
 * principal, next installment, schedule health), the active-claim banner and
 * the modification log, most recent first — the latest few shown, the rest
 * expanding in place. Dumb — interactions are callbacks the page wires to the
 * shell; only the log's open/closed state is local.
 */
export function ContractCurrentState({ contract, onOpenClaimFile }: ContractCurrentStateProps) {
  const { current } = contract;
  const [historyOpen, setHistoryOpen] = useState(false);
  const recent = current.modifications.slice(0, VISIBLE_MODIFICATIONS);
  const older = current.modifications.slice(VISIBLE_MODIFICATIONS);
  const elapsedPct = (current.installmentNo / current.installmentCount) * 100;

  const stats: Stat[] = [
    {
      label: "Remaining term",
      value: `${current.remainingTermMonths} months`,
      hint: `of ${current.installmentCount} · ${formatPct(elapsedPct, 1)} elapsed`,
    },
    {
      label: "Outstanding principal",
      value: formatCurrency(current.outstandingPrincipal),
      hint: `${formatPct(current.principalChangePct, 1)} since origination`,
    },
    {
      label: "Next installment",
      value: formatCurrency(current.nextInstallment),
      hint: `Due ${formatDmy(current.nextDueDate)} · ${current.paymentMethod}`,
    },
    {
      label: "Payment schedule",
      value: current.scheduleLabel,
      hint: `${current.daysPastDue} days past due · no incident`,
    },
  ];

  return (
    <section className="space-y-6" aria-labelledby="contract-current-state">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="contract-current-state" className="text-xl font-semibold tracking-tight">
          Current state
        </h2>
        <p className="text-sm text-muted-foreground">
          {current.periodLabel} · installment N° {current.installmentNo} of{" "}
          {current.installmentCount} · updated {formatDmy(current.updatedAt)}
        </p>
      </div>
      <Separator />
      <StatStrip stats={stats} />

      {current.activeClaim && (
        <>
          <Separator />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber-500" />
            <span className="font-semibold">Active claim · {current.activeClaim.claimNo}</span>
            <span className="text-muted-foreground">
              — {current.activeClaim.kind} · {current.activeClaim.statusLabel} since{" "}
              {formatDmy(current.activeClaim.since)}
              {current.activeClaim.installmentsSuspended && " · installments suspended"}
            </span>
            <Button
              variant="link"
              className="ml-auto h-auto p-0"
              onClick={() => onOpenClaimFile(current.activeClaim!.claimNo)}
            >
              View claim file →
            </Button>
          </div>
        </>
      )}

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Modifications · {current.modifications.length} entries — most recent first
        </p>
        <Separator />
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <ModificationList modifications={recent} />
          <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
            <ModificationList modifications={older} />
          </CollapsibleContent>
          {older.length > 0 && (
            <CollapsibleTrigger render={<Button variant="link" className="h-auto p-0 text-sm" />}>
              {historyOpen ? "View less" : `View ${older.length} more`}
              <ChevronDown className={cn("transition-transform", historyOpen && "rotate-180")} />
            </CollapsibleTrigger>
          )}
        </Collapsible>
      </div>
    </section>
  );
}
