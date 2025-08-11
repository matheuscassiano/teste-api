import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('users')
export class User {
  @ApiProperty({ description: 'ID único do usuário' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nome do usuário' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ description: 'Email do usuário' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'Data de criação do usuário' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização do usuário' })
  @UpdateDateColumn()
  updatedAt: Date;
}
