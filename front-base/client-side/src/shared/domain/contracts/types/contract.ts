import { z } from "zod";

/**
 * Canonical mortgage-contract domain — the single source of truth for the
 * shape the Contracts app and the mock backend agree on. Mirrors
 * `shared/domain/orders`: schemas + display metadata live here once, apps
 * stay ignorant of the wire format.
 */

export const CONTRACT_STATUSES = ["active", "closed", "defaulted"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

/** Display metadata for statuses (label + dot colour), same idea as orders. */
export const CONTRACT_STATUS_META: Record<
  ContractStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  active: {
    label: "Active",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  closed: {
    label: "Closed",
    dotClass: "bg-muted-foreground/60",
    textClass: "text-muted-foreground",
  },
  defaulted: {
    label: "Defaulted",
    dotClass: "bg-destructive",
    textClass: "text-destructive",
  },
};

/** The seeded demo record — the index route redirects to it (no list yet). */
export const DEFAULT_CONTRACT_NO = "CTR-2023-004821";

// --- snapshot at origination ("Initial state") -------------------------------

export const loanTermsSchema = z.object({
  borrowedAmount: z.number(),
  /** Bank margin over the base rate, in percent (1.85 → "1.85%"). */
  primeMarginPct: z.number(),
  baseRateName: z.string(),
  baseRatePct: z.number(),
  nominalRatePct: z.number(),
  nominalRateKind: z.enum(["fixed", "variable"]),
  termMonths: z.number(),
  monthlyInstallment: z.number(),
});

export const riskAssessmentSchema = z.object({
  /** Fine grade, e.g. "B+". */
  grade: z.string(),
  /** Human band, e.g. "Upper medium". */
  gradeBand: z.string(),
  /** 0-based position on the A–F scale (drives the risk-grade scale UI). */
  gradeIndex: z.number().int().min(0).max(5),
  probabilityOfDefaultPct: z.number(),
  scoringModel: z.string(),
  committeeDecision: z.string(),
  committeeDate: z.string(), // YMD
});

export const borrowerSchema = z.object({
  name: z.string(),
  dateOfBirth: z.string(), // YMD
  ageAtSigning: z.number(),
  nationalId: z.string(),
  maritalStatus: z.string(),
  occupation: z.string(),
  annualGrossIncome: z.number(),
  coBorrower: z.string().nullable(),
});

export const collateralSchema = z.object({
  property: z.string(),
  appraisedValue: z.number(),
  /** Short appraisal context, e.g. "Feb 2023". */
  appraisalLabel: z.string(),
  ltvAtOriginationPct: z.number(),
  guarantee: z.string(),
  registration: z.string(),
  registrationDate: z.string(), // YMD
  notary: z.string(),
});

// --- live snapshot ("Current state") -----------------------------------------

export const claimSchema = z.object({
  claimNo: z.string(),
  kind: z.string(),
  statusLabel: z.string(),
  since: z.string(), // YMD
  installmentsSuspended: z.boolean(),
});

export const modificationSchema = z.object({
  date: z.string(), // YMD
  kind: z.string(),
  description: z.string(),
  agent: z.string(),
});

export const contractSchema = z.object({
  id: z.number(),
  contractNo: z.string(),
  status: z.enum(CONTRACT_STATUSES),
  borrowerName: z.string(),
  product: z.string(),
  /** One-line rate summary for the header, e.g. "Fixed rate 4.80%". */
  rateSummary: z.string(),
  /** Headline figures (key-facts strip above the sections). */
  outstandingPrincipal: z.number(),
  monthlyPayment: z.number(),
  nextDueDate: z.string(), // YMD
  maturityDate: z.string(), // YMD
  initial: z.object({
    effectiveDate: z.string(), // YMD
    loanTerms: loanTermsSchema,
    risk: riskAssessmentSchema,
    borrower: borrowerSchema,
    collateral: collateralSchema,
  }),
  current: z.object({
    periodLabel: z.string(), // "November 2025"
    installmentNo: z.number(),
    installmentCount: z.number(),
    updatedAt: z.string(), // YMD
    remainingTermMonths: z.number(),
    outstandingPrincipal: z.number(),
    /** Signed % change of outstanding principal since origination. */
    principalChangePct: z.number(),
    nextInstallment: z.number(),
    nextDueDate: z.string(), // YMD
    paymentMethod: z.string(),
    daysPastDue: z.number(),
    scheduleLabel: z.string(),
    activeClaim: claimSchema.nullable(),
    /** Most recent first. */
    modifications: z.array(modificationSchema),
  }),
});

export type LoanTerms = z.infer<typeof loanTermsSchema>;
export type RiskAssessment = z.infer<typeof riskAssessmentSchema>;
export type Borrower = z.infer<typeof borrowerSchema>;
export type Collateral = z.infer<typeof collateralSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Modification = z.infer<typeof modificationSchema>;
export type Contract = z.infer<typeof contractSchema>;
