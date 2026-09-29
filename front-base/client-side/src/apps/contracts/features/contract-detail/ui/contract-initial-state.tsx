import type { Contract } from "@/shared/domain/contracts";
import { Separator } from "@/shared/components/ui/separator";
import { formatCurrency } from "@/shared/lib/format";

import { formatCurrencyWhole, formatDmy, formatPct } from "../lib/format";
import { RiskGradeScale } from "./risk-grade-scale";
import { SpecGroup, SpecRow } from "./spec-row";

/**
 * The "Initial state" section: the contract as signed, snapshotted at the
 * effective date. Four field groups (loan terms / risk / borrower /
 * collateral) in a two-column layout — the groups are the scan targets
 * (UxGuide §2). Dumb.
 */
export function ContractInitialState({ contract }: { contract: Contract }) {
  const { loanTerms, risk, borrower, collateral } = contract.initial;

  return (
    <section className="space-y-6" aria-labelledby="contract-initial-state">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="contract-initial-state" className="text-xl font-semibold tracking-tight">
          Initial state
        </h2>
        <p className="text-sm text-muted-foreground">
          Snapshot at effective date — {formatDmy(contract.initial.effectiveDate)}
        </p>
      </div>
      <Separator />

      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        <SpecGroup title="Loan terms">
          <SpecRow label="Borrowed amount" value={formatCurrency(loanTerms.borrowedAmount)} />
          <SpecRow label="Prime (bank margin)" value={formatPct(loanTerms.primeMarginPct)} />
          <SpecRow
            label={`Base rate — ${loanTerms.baseRateName}`}
            value={formatPct(loanTerms.baseRatePct)}
          />
          <SpecRow
            label="Nominal rate at signing"
            value={`${formatPct(loanTerms.nominalRatePct)} (${loanTerms.nominalRateKind})`}
          />
          <SpecRow
            label="Term"
            value={`${loanTerms.termMonths} months · ${loanTerms.termMonths / 12} years`}
          />
          <SpecRow
            label="Monthly installment"
            value={formatCurrency(loanTerms.monthlyInstallment)}
          />
        </SpecGroup>

        <SpecGroup title="Risk assessment">
          <SpecRow label="Risk grade" value={`${risk.grade} · ${risk.gradeBand}`} />
          <RiskGradeScale
            activeIndex={risk.gradeIndex}
            label={`${risk.grade} (${risk.gradeBand})`}
          />
          <SpecRow
            label="Probability of default (1 yr)"
            value={formatPct(risk.probabilityOfDefaultPct)}
          />
          <SpecRow label="Scoring model" value={risk.scoringModel} />
          <SpecRow
            label="Committee decision"
            value={`${risk.committeeDecision} · ${formatDmy(risk.committeeDate)}`}
          />
        </SpecGroup>

        <SpecGroup title="Borrower">
          <SpecRow
            label="Date of birth"
            value={`${formatDmy(borrower.dateOfBirth)} · ${borrower.ageAtSigning} at signing`}
          />
          <SpecRow
            label="National ID N°"
            value={<span className="font-mono text-xs">{borrower.nationalId}</span>}
          />
          <SpecRow label="Marital status" value={borrower.maritalStatus} />
          <SpecRow label="Occupation" value={borrower.occupation} />
          <SpecRow label="Annual gross income" value={formatCurrency(borrower.annualGrossIncome)} />
          <SpecRow label="Co-borrower" value={borrower.coBorrower ?? "—"} />
        </SpecGroup>

        <SpecGroup title="Mortgage & collateral">
          <SpecRow label="Property" value={collateral.property} />
          <SpecRow
            label="Appraised value"
            value={`${formatCurrencyWhole(collateral.appraisedValue)} · ${collateral.appraisalLabel}`}
          />
          <SpecRow
            label="LTV at origination"
            value={formatPct(collateral.ltvAtOriginationPct, 1)}
          />
          <SpecRow label="Guarantee" value={collateral.guarantee} />
          <SpecRow
            label="Registration"
            value={`${collateral.registration} · ${formatDmy(collateral.registrationDate)}`}
          />
          <SpecRow label="Notary" value={collateral.notary} />
        </SpecGroup>
      </div>
    </section>
  );
}
