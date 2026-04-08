import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CustomRole, CustomRoleDocument } from '../../../modules/settings/schemas/custom-role.schema';
import { UserOverride, UserOverrideDocument } from '../../../modules/settings/schemas/user-override.schema';

const jwtExtractor = (logger: Logger) =>
  ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    (req: any) => {
      const token = req?.headers?.['x-access-token'];
      if (typeof token === 'string' && token.trim() !== '') return token;
      return null;
    },
    (req: any) => {
      const token = req?.cookies?.accessToken;
      if (typeof token === 'string' && token.trim() !== '') return token;
      return null;
    },
    (req: any) => {
      // Minimal diagnostics for "random 401" reports
      // Only logs when request has no recognizable token.
      const auth = req?.headers?.authorization;
      const xToken = req?.headers?.['x-access-token'];
      const cToken = req?.cookies?.accessToken;
      if (!auth && !xToken && !cToken) {
        logger.debug('JWT Extract - no token found on request (authorization/x-access-token/cookie)');
      }
      return null;
    },
  ]);

export interface JwtPayload {
  sub?: string;
  id?: string;
  email?: string;
  role?: any;
  roleId?: any;
  customRoleId?: string;
  tenantId?: any;
  isSuperAdmin?: boolean;
  department?: string;
  isEmployee?: boolean;
  dataScope?: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  constructor(
    configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(CustomRole.name) private readonly customRoleModel: Model<CustomRoleDocument>,
    @InjectModel(UserOverride.name) private readonly userOverrideModel: Model<UserOverrideDocument>,
  ) {
    super({
      jwtFromRequest: jwtExtractor(new Logger(JwtStrategy.name)),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    console.log('[JWT STRATEGY] ===== VALIDATE CALLED =====');
    console.log('[JWT STRATEGY] payload:', JSON.stringify(payload));
    
    const userId = (payload.sub || payload.id) as string | undefined;
    const tenantId = payload.tenantId as string | undefined;

    const tenantObjId = (tenantId && Types.ObjectId.isValid(tenantId))
      ? new Types.ObjectId(tenantId)
      : undefined;

    const role = payload.role;
    const isSuperAdmin = payload.isSuperAdmin === true;
    const roleIdRaw = payload.customRoleId ?? payload.roleId ?? payload.role;
    const roleId = typeof roleIdRaw === 'string' ? roleIdRaw : (roleIdRaw?.roleId || roleIdRaw?._id || roleIdRaw);

    const customRoleId = payload.customRoleId;
    const dataScope = payload.dataScope || 'ALL';

    console.log('[JWT STRATEGY] Extracted userId:', userId);
    console.log('[JWT STRATEGY] Extracted dataScope:', dataScope);
    console.log('[JWT STRATEGY] Returning user object with dataScope:', dataScope);

    return {
      id: userId,
      _id: userId,
      sub: userId,
      email: payload.email,
      role: role,
      roleId: roleId,
      customRoleId: customRoleId,
      tenantId: tenantId,
      isSuperAdmin: isSuperAdmin,
      department: payload.department,
      isEmployee: payload.isEmployee || false,
      dataScope: dataScope,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };
  }
}
