import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Order } from '../entities/order.entity';
import { CreateOrderPayload, OrderStatus } from '../type';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly defaultOrderRepo: Repository<Order>,
  ) {}

  private mapDatabaseToModel(order: Order): Order {
    order.userId = order.user?.id || '';
    order.cartId = order.cart?.id || '';
    order.address = order.delivery?.address || '';

    order.items =
      order.cart?.items?.map((item) => ({
        productId: item.product_id,
        count: item.count,
      })) || [];

    return order;
  }

  async getAll(): Promise<Order[]> {
    const orders = await this.defaultOrderRepo.find({
      relations: ['user', 'cart', 'cart.items'],
    });
    return orders.map((order) => this.mapDatabaseToModel(order));
  }

  async findById(orderId: string): Promise<Order | null> {
    const order = await this.defaultOrderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'cart', 'cart.items'],
    });
    return order ? this.mapDatabaseToModel(order) : null;
  }

  async create(
    data: CreateOrderPayload,
    manager?: EntityManager,
  ): Promise<Order> {
    const repo = manager ? manager.getRepository(Order) : this.defaultOrderRepo;

    const newOrder = repo.create({
      user: { id: data.userId },
      cart: { id: data.cartId },
      payment: {},
      delivery: { address: data.address },
      comments: '',
      status: OrderStatus.Open,
      total: data.total,
      statusHistory: [
        {
          comment: '',
          status: OrderStatus.Open,
          timestamp: Date.now(),
        },
      ],
    });

    const savedOrder = await repo.save(newOrder);

    savedOrder.userId = data.userId;
    savedOrder.cartId = data.cartId;
    savedOrder.address = data.address;
    savedOrder.items = data.items;

    return savedOrder;
  }

  async update(
    orderId: string,
    data: Partial<Order>,
    manager?: EntityManager,
  ): Promise<Order> {
    const repo = manager ? manager.getRepository(Order) : this.defaultOrderRepo;
    const order = await repo.findOne({ where: { id: orderId } });

    if (!order) {
      throw new Error('Order does not exist.');
    }

    const updatedOrder = repo.merge(order, data, { id: orderId });
    const savedOrder = await repo.save(updatedOrder);
    return this.mapDatabaseToModel(savedOrder);
  }
}
