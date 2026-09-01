import { formatMonth } from "./MonthPicker";
import { statusMeta, type ShowcaseState } from "./data";

/**
 * The plain table driven by the global `table` CSS in styles.css — used by
 * the editorial, cards and soft designs. Selection is a row click, which
 * publishes a shell event (see useShowcase).
 */
export function ProjectsTable({ state }: { state: ShowcaseState }) {
  return (
    <table className="mt-3">
      <thead>
        <tr>
          <th>Id</th>
          <th>Project</th>
          <th>Month</th>
          <th>Status</th>
          <th>Budget</th>
        </tr>
      </thead>
      <tbody>
        {state.filtered.map((p) => (
          <tr
            key={p.id}
            className={p.id === state.selected ? "selected" : undefined}
            onClick={() => state.onSelect(p)}
          >
            <td>{p.id}</td>
            <td>{p.name}</td>
            <td>{formatMonth(p.month)}</td>
            <td>{statusMeta[p.status].label}</td>
            <td>€{p.budget.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
