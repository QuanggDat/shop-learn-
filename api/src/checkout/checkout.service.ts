import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { CreateCheckoutDto } from './checkout.dto';

@Injectable()
export class CheckoutService {
  private readonly stripe: Stripe;
  private readonly webUrl: string;
  private readonly webhookSecret: string;

  constructor(
    config: ConfigService,
    private readonly products: ProductsService,
    private readonly orders: OrdersService,
  ) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'));
    this.webUrl = config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    this.webhookSecret = config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
  }

  async createSession(dto: CreateCheckoutDto) {
    // QUAN TRỌNG: giá luôn lấy từ server, không tin giá client gửi lên
    const items = dto.items.map((i) => {
      const p = this.products.findOne(i.productId);
      return { productId: p.id, name: p.name, price: p.price, quantity: i.quantity };
    });

    const order = this.orders.create(items);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((i) => ({
        quantity: i.quantity,
        price_data: { currency: 'usd', unit_amount: i.price, product_data: { name: i.name } },
      })),
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      success_url: `${this.webUrl}/success?orderId=${order.id}`,
      cancel_url: `${this.webUrl}/cart`,
    });

    this.orders.update(order.id, { stripeSessionId: session.id });
    return { url: session.url, orderId: order.id };
  }

  /** Stripe gọi vào đây khi có sự kiện. Đây là nguồn sự thật để đánh dấu "đã thanh toán". */
  handleWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!rawBody || !signature) throw new BadRequestException('Thiếu body hoặc chữ ký');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      throw new BadRequestException('Chữ ký webhook không hợp lệ');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid' && session.metadata?.orderId) {
        this.orders.update(session.metadata.orderId, { status: 'paid' });
      }
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.orderId)
        this.orders.update(session.metadata.orderId, { status: 'expired' });
    }
    return { received: true };
  }
}
