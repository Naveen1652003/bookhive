import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';
import { orderSchema } from '../validators/schemas';

export const getOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search = '',
      status,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { order_number: { contains: search as string, mode: 'insensitive' } },
        { customer_name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as string;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          items: {
            include: {
              book: { select: { id: true, title: true, isbn: true } },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const syncShopifyOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Simulated fetch of orders from Shopify API
    // Creates mock shopify orders locally
    const shopifyMockOrders = [
      {
        order_number: `SH-${Math.floor(100000 + Math.random() * 900000)}`,
        customer_name: 'Jane Doe',
        customer_email: 'jane@example.com',
        amount: 89.97,
        status: 'Paid',
        delivery_method: 'Courier Service',
      },
      {
        order_number: `SH-${Math.floor(100000 + Math.random() * 900000)}`,
        customer_name: 'John Miller',
        customer_email: 'john.miller@example.com',
        amount: 45.50,
        status: 'Fulfilled',
        delivery_method: 'Standard Express',
      }
    ];

    const importedOrders = [];

    // Ensure we have at least one book in DB to link
    const book = await prisma.book.findFirst();

    for (const mockOrd of shopifyMockOrders) {
      const existing = await prisma.order.findUnique({
        where: { order_number: mockOrd.order_number }
      });
      if (existing) continue;

      const created = await prisma.order.create({
        data: {
          order_number: mockOrd.order_number,
          customer_name: mockOrd.customer_name,
          customer_email: mockOrd.customer_email,
          amount: mockOrd.amount,
          status: mockOrd.status,
          delivery_method: mockOrd.delivery_method,
        }
      });

      if (book) {
        await prisma.orderItem.create({
          data: {
            order_id: created.id,
            book_id: book.id,
            quantity: 2,
            price: book.price,
          }
        });
      }

      importedOrders.push(created);
    }

    await AuditService.log(
      req.user?.id || null,
      'ORDERS_SYNC',
      `Synced ${importedOrders.length} new orders from Shopify`,
      req.ip
    );

    await prisma.syncLog.create({
      data: {
        type: 'OrderSync',
        status: 'Success',
        message: `Synced ${importedOrders.length} orders from Shopify`,
      }
    });

    return res.json({
      message: `Successfully synced ${importedOrders.length} orders from Shopify`,
      count: importedOrders.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const getPurchaseOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      include: {
        supplier: { select: { name: true, email: true } },
        items: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return res.json(pos);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const createPurchaseOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supplier_id, items } = req.body; // items: Array of { isbn, title, quantity, unit_price }
    if (!supplier_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Supplier ID and purchase items are required' });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: parseInt(supplier_id, 10) } });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const totalAmount = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unit_price), 0);
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        po_number: poNumber,
        supplier_id: supplier.id,
        total_amount: totalAmount,
        status: 'Draft',
        items: {
          create: items.map((itm: any) => ({
            isbn: itm.isbn,
            title: itm.title,
            quantity: parseInt(itm.quantity, 10),
            unit_price: parseFloat(itm.unit_price),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    await AuditService.log(
      req.user?.id || null,
      'PO_CREATE',
      `Created Purchase Order ${poNumber} for supplier ${supplier.name}`,
      req.ip
    );

    return res.status(201).json(po);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const updatePurchaseOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // e.g. "Sent", "Approved", "Rejected", "Completed"
  try {
    const poId = parseInt(id, 10);
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status },
    });

    // If purchase order is completed, we should receive the books and increment local quantities!
    if (status === 'Completed' && po.status !== 'Completed') {
      for (const item of po.items) {
        const book = await prisma.book.findFirst({
          where: { isbn: item.isbn },
        });
        if (book) {
          await prisma.book.update({
            where: { id: book.id },
            data: {
              quantity: { increment: item.quantity },
            },
          });
        }
      }
      await AuditService.log(
        req.user?.id || null,
        'PO_COMPLETED',
        `Completed PO ${po.po_number}. Stock levels updated.`,
        req.ip
      );
    }

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const getPickSlip = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        items: {
          include: {
            book: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Return a structured picker slip object ready for pdf/print rendering
    const pickSlip = {
      orderNumber: order.order_number,
      customerName: order.customer_name,
      deliveryMethod: order.delivery_method,
      date: order.created_at,
      items: order.items.map((item) => ({
        isbn: item.book.isbn,
        sku: item.book.sku || 'N/A',
        title: item.book.title,
        quantity: item.quantity,
        binLocation: `A-Row${Math.floor(1 + Math.random() * 5)}-Shelf${Math.floor(1 + Math.random() * 4)}`, // Simulated warehousing location
      })),
    };

    return res.json(pickSlip);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};
