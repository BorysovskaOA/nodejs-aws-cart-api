import {
  Controller,
  Get,
  Delete,
  Put,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BasicAuthGuard } from '../auth';
import { Order, OrderService } from '../order';
import { AppRequest, getUserIdFromRequest } from '../shared';
import { calculateCartTotal } from './models-rules';
import { CartService } from './services';
import { CartItem } from './models';
import { CreateOrderDto, PutCartPayload } from 'src/order/type';
import { User } from 'src/users/entities/user.entity';

@Controller()
export class CartController {
  constructor(
    private cartService: CartService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
    private dataSource: DataSource,
  ) {}

  @UseGuards(BasicAuthGuard)
  @Get('api/profile/cart')
  async findUserCart(@Req() req: AppRequest): Promise<CartItem[]> {
    const cart = await this.cartService.findOrCreateByUserId(
      getUserIdFromRequest(req),
    );

    return await this.cartService.mapToCartItems(cart.items);
  }

  @UseGuards(BasicAuthGuard)
  @Put('api/profile/cart')
  async updateUserCart(
    @Req() req: AppRequest,
    @Body() body: PutCartPayload,
  ): Promise<CartItem[]> {
    const cart = await this.cartService.updateByUserId(
      getUserIdFromRequest(req),
      body,
    );

    return await this.cartService.mapToCartItems(cart.items);
  }

  @UseGuards(BasicAuthGuard)
  @Delete('api/profile/cart')
  @HttpCode(HttpStatus.OK)
  async clearUserCart(@Req() req: AppRequest) {
    await this.cartService.removeByUserId(getUserIdFromRequest(req));
  }

  @UseGuards(BasicAuthGuard)
  @Put('api/order')
  async checkout(@Req() req: AppRequest, @Body() body: CreateOrderDto) {
    let userId = getUserIdFromRequest(req);

    return await this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(User, { where: { id: userId } });
      if (!user) {
        const newUser = manager.create(User, { id: userId });
        user = await manager.save(User, newUser);
        userId = user.id;
      }

      const cart = await this.cartService.findByUserId(userId, manager);

      if (!(cart && cart.items.length)) {
        throw new BadRequestException('Cart is empty');
      }

      const { id: cartId, items } = cart;
      const domainItems = await this.cartService.mapToCartItems(items);
      const total = calculateCartTotal(domainItems);

      const order = await this.orderService.create(
        {
          userId,
          cartId,
          items: domainItems.map(({ product, count }) => ({
            productId: product.id,
            count,
          })),
          address: body.address,
          total,
        },
        manager,
      );
      await this.cartService.removeByUserId(userId, manager);

      return {
        order,
      };
    });
  }

  @UseGuards(BasicAuthGuard)
  @Get('api/order')
  async getOrder(): Promise<Order[]> {
    return await this.orderService.getAll();
  }
}
