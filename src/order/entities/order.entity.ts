import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cart } from '../../cart/entities/cart.entity';
import { User } from '../../users/entities/user.entity';
import { OrderStatus } from '../type';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToOne(() => Cart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @Column({ type: 'json', nullable: false, default: {} })
  payment: Record<string, any>;

  @Column({ type: 'json', nullable: false, default: {} })
  delivery: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    nullable: false,
    default: OrderStatus.Open,
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  total: number;

  @Column({ type: 'json', nullable: false, default: [] })
  statusHistory: Array<{
    comment: string;
    status: OrderStatus;
    timestamp: number;
  }>;

  userId: string;
  cartId: string;
  items: Array<{ productId: string; count: number }>;
  address: any;
}
