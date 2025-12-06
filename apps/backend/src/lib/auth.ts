import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/index.js';

const JWT_SECRET = env.JWT_SECRET as string;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN as string;

export interface JWTPayload {
  userId: string;
  email: string;
  cooperativeId: string | null; // Can be null for system admins
  roleId?: string;
}

export const generateToken = (payload: JWTPayload): string => {
  // Convert payload to plain object for jwt.sign
  const tokenPayload: Record<string, string | null | undefined> = {
    userId: payload.userId,
    email: payload.email,
    cooperativeId: payload.cooperativeId,
  };
  if (payload.roleId) {
    tokenPayload.roleId = payload.roleId;
  }
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as string | number,
  };
  return jwt.sign(tokenPayload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
