import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cart } from './cart.entity';

@Entity('cart_items')
export class CartItem {
  @PrimaryColumn({ type: 'uuid' })
  cart_id: string;

  @PrimaryColumn({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'integer', nullable: false })
  count: number;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;
}
