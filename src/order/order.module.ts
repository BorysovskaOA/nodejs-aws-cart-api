import { forwardRef, Module } from '@nestjs/common';
import { OrderService } from './services';
import { Order } from './entities/order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { CartModule } from 'src/cart/cart.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    UsersModule,
    forwardRef(() => CartModule),
  ],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
