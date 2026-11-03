import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export type OrderStatus = 'pending' | 'paid' | 'expired';

export interface Order {
  id: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  total: number;
  status: OrderStatus;
  stripeSessionId?: string;
  createdAt: string;
}

// Lưu đơn hàng vào file JSON cho đơn giản. Thực tế dùng DB (Postgres + Prisma/TypeORM).
const FILE = join(process.cwd(), 'data', 'orders.json');

@Injectable()
export class OrdersService {
  private read(): Order[] {
    return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : [];
  }

  private write(orders: Order[]) {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(orders, null, 2));
  }

  create(items: Order['items']): Order {
    const order: Order = {
      id: randomUUID(),
      items,
      total: items.reduce((s, i) => s + i.price * i.quantity, 0),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.write([...this.read(), order]);
    return order;
  }

  update(id: string, patch: Partial<Order>): Order {
    const orders = this.read();
    const i = orders.findIndex((o) => o.id === id);
    if (i < 0) throw new NotFoundException(`Không có đơn ${id}`);
    orders[i] = { ...orders[i], ...patch };
    this.write(orders);
    return orders[i];
  }

  findOne(id: string): Order {
    const o = this.read().find((x) => x.id === id);
    if (!o) throw new NotFoundException(`Không có đơn ${id}`);
    return o;
  }

  findAll(): Order[] {
    return this.read().reverse();
  }
}
