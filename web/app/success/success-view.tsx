'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../../lib/cart';
import { formatPrice, getOrder } from '../../lib/api';
import type { Order } from '../../lib/api';

export function SuccessView() {
  const orderId = useSearchParams().get('orderId');
  const { clear } = useCart();
  const [order, setOrder] = useState<Order | null>(null);

  // Stripe redirect về đây ngay, nhưng webhook có thể đến trễ vài giây
  // -> hỏi lại server cho tới khi đơn chuyển sang "paid".
  useEffect(() => {
    if (!orderId) return;
    let stop = false;
    let tries = 0;

    async function poll() {
      try {
        const o = await getOrder(orderId as string);
        if (stop) return;
        setOrder(o);
        if (o.status === 'paid') {
          clear();
          return;
        }
      } catch {}
      if (!stop && ++tries < 20) setTimeout(poll, 1500);
    }
    poll();
    return () => {
      stop = true;
    };
  }, [orderId, clear]);

  if (!orderId) return <p>Thiếu mã đơn hàng.</p>;

  return (
    <div className="panel">
      {order?.status === 'paid' ? (
        <>
          <h1>🎉 Thanh toán thành công</h1>
          <p>Mã đơn: {order.id}</p>
          <p>Tổng: {formatPrice(order.total)}</p>
        </>
      ) : (
        <>
          <h1>Đang xác nhận thanh toán…</h1>
          <p className="muted">
            Đang chờ Stripe báo về server (webhook). Nếu mãi không đổi, kiểm tra{' '}
            <code>stripe listen</code> đã chạy chưa.
          </p>
        </>
      )}
      <Link href="/">← Về trang chủ</Link>
    </div>
  );
}
