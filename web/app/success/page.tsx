import { Suspense } from 'react';
import { SuccessView } from './success-view';

// useSearchParams cần nằm trong Suspense khi build
export default function SuccessPage() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <SuccessView />
    </Suspense>
  );
}
