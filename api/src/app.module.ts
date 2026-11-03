import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CheckoutModule } from './checkout/checkout.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ProductsModule, OrdersModule, CheckoutModule],
})
export class AppModule {}
