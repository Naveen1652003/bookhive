import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';
import { categorySchema } from '../validators/schemas';
import { logger } from '../utils/logger';

export const getCategories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { books: true } }
      },
      orderBy: { name: 'asc' },
    });
    return res.json(categories);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = categorySchema.parse(req.body);

    const existing = await prisma.category.findUnique({ where: { name: validated.name } });
    if (existing) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const category = await prisma.category.create({
      data: {
        name: validated.name,
        parent_id: validated.parent_id,
        image_url: validated.image_url,
        seo_title: validated.seo_title || validated.name,
        seo_description: validated.seo_description,
      },
    });

    await AuditService.log(
      req.user?.id || null,
      'CATEGORY_CREATE',
      `Created category "${category.name}"`,
      req.ip
    );

    // Simulate collection sync with Shopify in background
    logger.info(`[Shopify Mock] Synchronizing collection for category: "${category.name}"`);
    await prisma.category.update({
      where: { id: category.id },
      data: { shopify_collection_id: `gid://shopify/Collection/${Math.floor(100000000 + Math.random() * 900000000)}` },
    });

    return res.status(201).json(category);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || error });
  }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const validated = categorySchema.parse(req.body);
    const catId = parseInt(id, 10);

    const existing = await prisma.category.findUnique({ where: { id: catId } });
    if (!existing) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check circular dependencies
    if (validated.parent_id === catId) {
      return res.status(400).json({ message: 'A category cannot be its own parent' });
    }

    const updated = await prisma.category.update({
      where: { id: catId },
      data: {
        name: validated.name,
        parent_id: validated.parent_id,
        image_url: validated.image_url,
        seo_title: validated.seo_title,
        seo_description: validated.seo_description,
      },
    });

    await AuditService.log(
      req.user?.id || null,
      'CATEGORY_UPDATE',
      `Updated category "${updated.name}" details`,
      req.ip
    );

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || error });
  }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const catId = parseInt(id, 10);
    const category = await prisma.category.findUnique({ where: { id: catId } });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await prisma.category.delete({ where: { id: catId } });

    await AuditService.log(
      req.user?.id || null,
      'CATEGORY_DELETE',
      `Deleted category "${category.name}"`,
      req.ip
    );

    return res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};
