import type { OrderException } from "@statisticalsystem/parser";
import { Panel } from "../../../components/Panel";

type OrderExceptionListProps = {
  exceptions: OrderException[];
};

export function OrderExceptionList({ exceptions }: OrderExceptionListProps) {
  if (exceptions.length === 0) {
    return null;
  }

  return (
    <Panel title="拆分异常">
      <ul className="exception-list">
        {exceptions.map((exception) => (
          <li className="exception-list__item" key={exception.id}>
            <strong className="exception-list__reason">{exception.reason}</strong>
            <span>{exception.raw}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
