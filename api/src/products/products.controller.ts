import { Controller, Get, Param } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() {
    return this.products.findAll();
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.products.findOne(id);
  }
}
