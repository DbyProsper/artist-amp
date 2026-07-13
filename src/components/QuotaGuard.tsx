import { cloneElement, ReactElement } from 'react';
import { useQuotaGate } from '@/hooks/useQuotaGate';
import UpgradeModal from './UpgradeModal';
import type { QuotaKey } from '@/lib/planLimits';

interface Props {
  quotaKey: QuotaKey;
  onAllowed: () => void;
  children: ReactElement;
}

export default function QuotaGuard({ quotaKey, onAllowed, children }: Props) {
  const { checkQuota, blocked, clearBlocked, plan } = useQuotaGate();

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    const result = checkQuota(quotaKey);
    if (result.allowed) {
      onAllowed();
    }
  };

  return (
    <>
      {cloneElement(children, { onClick: handleClick })}
      {blocked && (
        <UpgradeModal
          reason={blocked.reason}
          quotaKey={blocked.key}
          currentPlan={plan}
          onClose={clearBlocked}
        />
      )}
    </>
  );
}
