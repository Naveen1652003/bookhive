import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';
import { supplierSchema } from '../validators/schemas';

export const getSuppliers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: {
          select: { books: true, purchase_orders: true }
        }
      },
      orderBy: { name: 'asc' },
    });
    return res.json(suppliers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const createSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        address: validated.address,
        tax_id: validated.tax_id,
        website: validated.website,
        notes: validated.notes,
      },
    });

    await AuditService.log(
      req.user?.id || null,
      'SUPPLIER_CREATE',
      `Created supplier "${supplier.name}"`,
      req.ip
    );

    return res.status(201).json(supplier);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || error });
  }
};

export const updateSupplier = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const validated = supplierSchema.parse(req.body);
    const supplierId = parseInt(id, 10);

    const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!existing) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const updated = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        address: validated.address,
        tax_id: validated.tax_id,
        website: validated.website,
        notes: validated.notes,
      },
    });

    await AuditService.log(
      req.user?.id || null,
      'SUPPLIER_UPDATE',
      `Updated supplier "${updated.name}" details`,
      req.ip
    );

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || error });
  }
};

export const deleteSupplier = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const supplierId = parseInt(id, 10);
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    await prisma.supplier.delete({ where: { id: supplierId } });

    await AuditService.log(
      req.user?.id || null,
      'SUPPLIER_DELETE',
      `Deleted supplier "${supplier.name}"`,
      req.ip
    );

    return res.json({ message: 'Supplier deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const getSupplierAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const supplierId = parseInt(id, 10);
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { supplier_id: supplierId },
    });

    const totalOrdersCount = purchaseOrders.length;
    const completedOrders = purchaseOrders.filter(po => po.status === 'Completed');
    const spend = purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0);

    return res.json({
      supplierId,
      totalOrdersCount,
      completedOrdersCount: completedOrders.length,
      totalSpend: spend,
      averageOrderValue: totalOrdersCount > 0 ? (spend / totalOrdersCount) : 0,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};
