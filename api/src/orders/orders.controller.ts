import { Controller, Get, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list() {
    return this.orders.findAll();
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.orders.findOne(id);
  }
}
