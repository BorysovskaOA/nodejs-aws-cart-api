import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CartStatuses, Product } from '../models';
import { CartItem } from '../entities/cart-item.entity';
import { CartItem as FECardItem } from '../models';

import { Cart } from '../entities/cart.entity';
import { PutCartPayload } from 'src/order/type';
import { BatchGetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CartService {
  private readonly dynamoDocClient: DynamoDBDocumentClient;
  private readonly productsTable: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    const client = new DynamoDBClient();
    this.productsTable = this.configService.get<string>('PRODUCTS_TABLE');
    this.dynamoDocClient = DynamoDBDocumentClient.from(client);
  }

  async mapToCartItems(entities: CartItem[]): Promise<FECardItem[]> {
    if (!entities.length) return [];

    const uniqueProductIds = Array.from(
      new Set(entities.map((e) => e.product_id)),
    );

    const keys = uniqueProductIds.map((id) => ({ id }));

    const command = new BatchGetCommand({
      RequestItems: {
        [this.productsTable]: {
          Keys: keys,
        },
      },
    });

    const response = await this.dynamoDocClient.send(command);
    const dynamoProducts = (response.Responses?.[this.productsTable] ||
      []) as Product[];

    const productMap = new Map<string, Product>();
    dynamoProducts.forEach((p) => productMap.set(p.id, p));

    return entities.map((entity) => {
      const fetchedProduct = productMap.get(entity.product_id);

      return {
        product: fetchedProduct || {
          id: entity.product_id,
          title: 'Unknown Product',
          description: 'Product details missing from DynamoDB',
          price: 0,
        },
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
        relations: ['items'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!cart) {
        const newCart = manager.create(Cart, {
          user: { id: userId },
          status: CartStatuses.OPEN,
          items: [],
        });
        cart = await manager.save(Cart, newCart);
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
