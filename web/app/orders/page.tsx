import { API_URL, formatPrice } from '../../lib/api';
import type { Order } from '../../lib/api';

const STATUS_LABEL: Record<Order['status'], string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  expired: 'Hết hạn',
};

async function getOrders(): Promise<Order[]> {
  const res = await fetch(`${API_URL}/orders`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không tải được danh sách đơn hàng');
  return res.json();
}

// Server Component: đơn mới nhất nằm trên cùng (API đã đảo thứ tự).
export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <>
      <h1>Đơn hàng</h1>
      {orders.length === 0 ? (
        <p>Chưa có đơn hàng nào.</p>
      ) : (
        <div className="panel">
          {orders.map((o) => (
            <div className="row" key={o.id}>
              <div className="grow">
                <strong>{o.id.slice(0, 8)}</strong>
                <div className="muted">
                  {new Date(o.createdAt).toLocaleString('vi-VN')} ·{' '}
                  {o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                </div>
              </div>
              <span className="muted">{STATUS_LABEL[o.status]}</span>
              <span className="price">{formatPrice(o.total)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
