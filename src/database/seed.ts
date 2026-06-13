import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Order } from '../order/entities/order.entity';
import { CartStatuses } from '../cart/models';
import { OrderStatus } from '../order/type';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DB,
  entities: [User, Cart, CartItem, Order],
  synchronize: false,
});

const mockUserId = '11111111-1111-1111-1111-111111111111';

const productIds = [
  '87dc0376-c89c-448f-91b6-5c3445ed445d',
  'f3d45808-b452-469b-bb68-3ab1438112b2',
  'a9094770-498c-4043-8f0a-6e540d997232',
];

async function seed() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await AppDataSource.initialize();
    console.log('Database connected successfully!');

    const userRepo = AppDataSource.getRepository(User);
    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);
    const orderRepo = AppDataSource.getRepository(Order);

    let user = await userRepo.findOne({ where: { id: mockUserId } });
    if (!user) {
      console.log('Creating a test user record...');
      user = userRepo.create({ id: mockUserId });
      await userRepo.save(user);
    }

    console.log('Creating a historical closed cart for the order...');
    let closedCart = cartRepo.create({
      user: user,
      status: CartStatuses.ORDERED,
    });
    closedCart = await cartRepo.save(closedCart);

    console.log('Adding product rows to the closed cart...');
    for (const productId of productIds) {
      const cartItem = itemRepo.create({
        cart_id: closedCart.id,
        product_id: productId,
        count: Math.floor(Math.random() * 3) + 1,
      });
      await itemRepo.save(cartItem);
    }

    console.log('Seeding the historical order record...');
    const order = orderRepo.create({
      user: user,
      cart: closedCart,
      payment: { type: 'credit_card', status: 'paid' },
      delivery: {
        address: { address: '123 Test St', city: 'Lviv', zip: '79000' },
      },
      comments: 'Seed data order',
      status: OrderStatus.Open,
      total: 334.49,
      statusHistory: [
        {
          comment: 'Order initialized via seeding',
          status: OrderStatus.Open,
          timestamp: Date.now(),
        },
      ],
    });
    await orderRepo.save(order);
    console.log(`Successfully created Order ID: ${order.id}`);

    console.log('Creating a fresh new active OPEN cart for the user...');
    const openCart = cartRepo.create({
      user: user,
      status: CartStatuses.OPEN,
    });
    await cartRepo.save(openCart);

    console.log('All PostgreSQL tables seeded successfully!');
  } catch (error) {
    console.error('Error executing seed script:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('Database connection disconnected.');
  }
}

seed();
