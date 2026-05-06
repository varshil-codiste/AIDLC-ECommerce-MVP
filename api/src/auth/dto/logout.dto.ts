import { IsString, IsUUID } from 'class-validator';

export class LogoutDto {
  @IsUUID()
  tokenFamily!: string;

  @IsString()
  refreshToken!: string;
}
