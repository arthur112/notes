import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { useContract } from "@/shared/domain/contracts";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useShell } from "@/shell/ShellProvider";

import { ContractCurrentState } from "../ui/contract-current-state";
import { ContractHero } from "../ui/contract-hero";
import { ContractInitialState } from "../ui/contract-initial-state";

function ContractSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

/**
 * Contracts detail — the mortgage contract as a deep-linkable record page at
 * `/apps/contracts/$contractNo`. Composition only: data comes from the shared
 * contracts domain, sections are the dumb `ContractHero` /
 * `ContractInitialState` / `ContractCurrentState` panels, and claim
 * interactions are published onto the shell event bus (watch them from the
 * Finance app's activity rail).
 */
export function ContractDetailPage() {
  const { contractNo } = useParams({ from: "/apps/contracts/$contractNo" });
  const { publish } = useShell();
  const contract = useContract(contractNo);

  if (contract.isPending) return <ContractSkeleton />;

  if (contract.isError || !contract.data) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Contract not found"
          description={contract.error?.message ?? `No contract matches “${contractNo}”.`}
        />
        <Button variant="outline" render={<Link to="/apps/contracts" />}>
          <ArrowLeft />
          Back to contracts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <ContractHero contract={contract.data} />
      <ContractInitialState contract={contract.data} />
      <ContractCurrentState
        contract={contract.data}
        onOpenClaimFile={(claimNo) => publish("contracts", `Opened claim file ${claimNo}`)}
      />
    </div>
  );
}
