import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CartStatuses } from '../models';
import { CartItem } from '../entities/cart-item.entity';
import { CartItem as FECardItem } from '../models';

import { Cart } from '../entities/cart.entity';
import { PutCartPayload } from 'src/order/type';

@Injectable()
export class CartService {
  constructor(private readonly dataSource: DataSource) {}

  async mapToCartItems(entities: CartItem[]): Promise<FECardItem[]> {
    if (!entities.length) return [];

    return entities.map((entity) => {
      return {
        product: entity.product,
        count: entity.count,
      };
    });
  }

  async findByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<Cart | null> {
    const repo = manager
      ? manager.getRepository(Cart)
      : this.dataSource.getRepository(Cart);
    return await repo.findOne({
      where: {
        user: { id: userId },
        status: CartStatuses.OPEN,
      },
      relations: ['items'],
    });
  }

  async createByUserId(userId: string, manager?: EntityManager): Promise<Cart> {
    const repo = manager
      ? manager.getRepository(Cart)
      : this.dataSource.getRepository(Cart);
    const userCart = repo.create({
      user: { id: userId },
      status: CartStatuses.OPEN,
      items: [],
    });
    return await repo.save(userCart);
  }

  async findOrCreateByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<Cart> {
    const userCart = await this.findByUserId(userId, manager);
    if (userCart) {
      return userCart;
    }
    return await this.createByUserId(userId, manager);
  }

  async updateByUserId(userId: string, payload: PutCartPayload): Promise<Cart> {
    return await this.dataSource.transaction(async (manager) => {
      let cart = await manager.findOne(Cart, {
        where: { user: { id: userId }, status: CartStatuses.OPEN },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cart) {
        const newCart = manager.create(Cart, {
          user: { id: userId },
          status: CartStatuses.OPEN,
          items: [],
        });
        cart = await manager.save(Cart, newCart);
      } else {
        cart.items = await manager.find(CartItem, {
          where: { cart_id: cart.id },
        });
      }

      const productId = payload.product.id;
      const existingItem = cart.items.find(
        (item) => item.cart_id === cart.id && item.product_id === productId,
      );

      if (!existingItem) {
        if (payload.count > 0) {
          const newItem = manager.create(CartItem, {
            cart_id: cart.id,
            product_id: productId,
            product: payload.product,
            count: payload.count,
          });
          await manager.save(CartItem, newItem);
        }
      } else if (payload.count === 0) {
        await manager.remove(CartItem, existingItem);
      } else {
        existingItem.count = payload.count;
        await manager.save(CartItem, existingItem);
      }

      const updatedCart = await manager.findOne(Cart, {
        where: { id: cart.id },
        relations: ['items'],
      });

      if (!updatedCart) throw new Error('Failed to load finalized cart status');
      return updatedCart;
    });
  }

  async removeByUserId(userId: string, manager?: EntityManager): Promise<void> {
    const repo = manager
      ? manager.getRepository(Cart)
      : this.dataSource.getRepository(Cart);
    const cart = await this.findByUserId(userId, manager);
    if (cart) {
      cart.status = CartStatuses.ORDERED;
      await repo.save(cart);
    }
  }
}
