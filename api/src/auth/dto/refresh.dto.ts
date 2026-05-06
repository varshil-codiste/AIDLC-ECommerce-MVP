import { IsString, IsUUID } from 'class-validator';

export class RefreshDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  tokenFamily!: string;

  @IsString()
  refreshToken!: string;
}
