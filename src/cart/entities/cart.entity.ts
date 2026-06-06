import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CartItem } from './cart-item.entity';
import { CartStatuses } from '../models';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @Column({ type: 'enum', enum: CartStatuses, default: CartStatuses.OPEN })
  status: CartStatuses;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
  items: CartItem[];
}
