import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';
import { registerSchema } from '../validators/schemas';

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
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
      req.user?.id || null,
      'USER_CREATE',
      `Admin created user account for ${user.email} with role ${user.role}`,
      req.ip
    );

    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || error });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { first_name, last_name, email, role, is_active } = req.body;
  try {
    const userId = parseInt(id, 10);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        first_name: first_name !== undefined ? first_name : existing.first_name,
        last_name: last_name !== undefined ? last_name : existing.last_name,
        email: email !== undefined ? email : existing.email,
        role: role !== undefined ? role : existing.role,
        is_active: is_active !== undefined ? is_active : existing.is_active,
      },
    });

    await AuditService.log(
      req.user?.id || null,
      'USER_UPDATE',
      `Updated user account properties for: ${updated.email}`,
      req.ip
    );

    const { password: _, ...userWithoutPassword } = updated;
    return res.json(userWithoutPassword);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const userId = parseInt(id, 10);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Do not allow deleting self
    if (req.user?.id === user.id) {
      return res.status(400).json({ message: 'Cannot delete your own administrative account' });
    }

    await prisma.user.delete({ where: { id: userId } });

    await AuditService.log(
      req.user?.id || null,
      'USER_DELETE',
      `Deleted user account: ${user.email}`,
      req.ip
    );

    return res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};
