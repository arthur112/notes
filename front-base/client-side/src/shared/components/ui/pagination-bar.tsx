import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export type PaginationBarProps = {
  page: number;
  totalPages: number;
  /** Total rows across all pages (server count). */
  count: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** Row-count summary; default renders "{start}–{end} of {count}". */
  summary?: string;
};

const DEFAULT_PAGE_SIZES = [25, 50, 100];

/** Dumb pagination controls for server-paged tables. */
export function PaginationBar({
  page,
  totalPages,
  count,
  pageSize,
  onPageChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  onPageSizeChange,
  summary,
}: PaginationBarProps) {
  const start = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, count);
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const [jump, setJump] = useState(String(page));

  // Keep the jump field honest when paging happens elsewhere (first/last, dots).
  useEffect(() => {
    setJump(String(page));
  }, [page]);

  const commitJump = () => {
    const next = Number.parseInt(jump, 10);
    if (Number.isFinite(next) && next >= 1 && next <= totalPages && next !== page) {
      onPageChange(next);
    } else {
      setJump(String(page));
    }
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 lg:flex-row">
      <p className="text-sm text-muted-foreground tabular-nums">
        {summary ?? `${start}–${end} of ${count.toLocaleString()}`}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Rows
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              aria-label="Rows per page"
              className="h-7 rounded-md border border-input bg-transparent px-1.5 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(1)}
            disabled={!canPrev}
            aria-label="First page"
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>

          {totalPages > 7 ? (
            <span className="flex items-center gap-1.5 px-1 text-sm text-muted-foreground">
              Page
              <Input
                value={jump}
                onChange={(event) => setJump(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitJump();
                  }
                }}
                onBlur={commitJump}
                inputMode="numeric"
                aria-label="Page number"
                className="h-7 w-12 px-1 text-center tabular-nums"
              />
              of {totalPages}
            </span>
          ) : (
            <span className="min-w-24 px-2 text-center text-sm text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
          )}

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
            aria-label="Last page"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
