import { CONTRACT_STATUS_META, type Contract } from "@/shared/domain/contracts";
import { Separator } from "@/shared/components/ui/separator";
import { formatCurrency } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { formatCurrencyWhole, formatDmy } from "../lib/format";
import { StatStrip, type Stat } from "./stat-strip";

/**
 * The record's identity block + key-facts strip (UxGuide §2): borrower name,
 * status and the mono contract reference, then the four figures 80% of visits
 * need — outstanding principal, monthly payment, next due date, maturity.
 * Dumb — resolved contract in, markup out.
 */
export function ContractHero({ contract }: { contract: Contract }) {
  const status = CONTRACT_STATUS_META[contract.status];

  const stats: Stat[] = [
    { label: "Outstanding principal", value: formatCurrencyWhole(contract.outstandingPrincipal) },
    { label: "Monthly payment", value: formatCurrency(contract.monthlyPayment) },
    { label: "Next due date", value: formatDmy(contract.nextDueDate) },
    { label: "Maturity", value: formatDmy(contract.maturityDate) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{contract.borrowerName}</h1>
          <span className={cn("flex items-center gap-1.5 text-sm font-medium", status.textClass)}>
            <span aria-hidden className={cn("size-2 rounded-full", status.dotClass)} />
            {status.label}
          </span>
        </div>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          {contract.contractNo} · {contract.product} · {contract.rateSummary}
        </p>
      </div>
      <Separator />
      <StatStrip stats={stats} />
    </div>
  );
}
