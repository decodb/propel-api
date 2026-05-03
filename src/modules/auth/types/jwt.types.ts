import { UserRole } from 'src/generated/prisma/enums';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole | 'SYSTEM_ADMIN';
  companyId?: number;
}
