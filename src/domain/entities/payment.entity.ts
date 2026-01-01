import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { PaymentMethod, PaymentStatus } from '../enums';

@Table({
  tableName: 'payments',
  timestamps: true,
})
export class Payment extends Model<Payment> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({
    type: DataType.STRING(11),
    allowNull: false,
    validate: {
      len: [11, 11],
    },
  })
  cpf: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  description: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
  })
  amount: number;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentMethod)),
    allowNull: false,
    field: 'payment_method',
  })
  paymentMethod: PaymentMethod;

  @Default(PaymentStatus.PENDING)
  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    allowNull: false,
  })
  status: PaymentStatus;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'external_reference',
  })
  externalReference: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'mercado_pago_id',
  })
  mercadoPagoId: string | null;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;
}
