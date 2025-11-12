import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CurrentUserDto {
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  _id: string;
}
