import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';
import { registerSchema, loginSchema } from '../validators/schemas';

const JWT_SECRET = process.env.JWT_SECRET || 'bookhive_jwt_secret_token_123!';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'bookhive_refresh_secret_token_abc!';

export const register = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existing) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);
    const user = await prisma.user.create({
      data: {
        first_name: validated.first_name,
        last_name: validated.last_name,
        email: validated.email,
        password: hashedPassword,
        role: validated.role || 'Viewer',
      },
    });

    await AuditService.log(
      user.id,
      'USER_REGISTER',
      `Registered user account for ${user.email} as ${user.role}`,
      req.ip
    );

    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || error });
  }
};

export const login = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: validated.email } });
    
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid credentials or inactive user' });
    }

    const matches = await bcrypt.compare(validated.password, user.password);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Sign tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: validated.rememberMe ? '30d' : '2h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await AuditService.log(
      user.id,
      'USER_LOGIN',
      `Successfully logged in. Role: ${user.role}`,
      req.ip
    );

    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || error });
  }
};

export const refresh = async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { id: number; email: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User is inactive or not found' });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({ accessToken });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

export const forgotPassword = async (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Simulate reset request
    await AuditService.log(
      user.id,
      'FORGOT_PASSWORD',
      `Requested reset password link for ${user.email}`,
      req.ip
    );
    return res.json({ message: 'Password reset link sent (Simulated)' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const resetPassword = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await AuditService.log(
      user.id,
      'RESET_PASSWORD',
      `Successfully reset password for ${user.email}`,
      req.ip
    );
    return res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};
