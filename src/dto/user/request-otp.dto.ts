import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestOtpDto {
  @IsNotEmpty()
  first_name: string;

  @IsNotEmpty()
  last_name: string;

  @IsEmail()
  email: string;
}
