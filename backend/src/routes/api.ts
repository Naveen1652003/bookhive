import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import * as authController from '../controllers/auth.controller';
import * as bookController from '../controllers/book.controller';
import * as orderController from '../controllers/order.controller';
import * as userController from '../controllers/user.controller';
import * as supplierController from '../controllers/supplier.controller';
import * as categoryController from '../controllers/category.controller';
import { prisma } from '../config/db';

const router = Router();

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);

// ==========================================
// 2. INVENTORY (BOOKS) ENDPOINTS
// ==========================================
router.get('/books', authenticateToken, bookController.getBooks);
router.get('/books/:id', authenticateToken, bookController.getBookById);
router.post('/books', authenticateToken, requireRole(['Super Admin', 'Admin', 'Inventory Manager']), bookController.createBook);
router.put('/books/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Inventory Manager']), bookController.updateBook);
router.delete('/books/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), bookController.deleteBook);
router.post('/books/import', authenticateToken, requireRole(['Super Admin', 'Admin', 'Inventory Manager']), bookController.importBooks);
router.post('/books/:id/shopify-sync', authenticateToken, requireRole(['Super Admin', 'Admin', 'Inventory Manager']), bookController.syncBookToShopify);

// ==========================================
// 3. ORDERS ENDPOINTS
// ==========================================
router.get('/orders', authenticateToken, orderController.getOrders);
router.post('/orders/sync', authenticateToken, requireRole(['Super Admin', 'Admin', 'Order Manager']), orderController.syncShopifyOrders);
router.get('/orders/pick-slip/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Order Manager']), orderController.getPickSlip);

// Purchase Orders (Procurement)
router.get('/orders/purchase-orders', authenticateToken, orderController.getPurchaseOrders);
router.post('/orders/purchase-orders', authenticateToken, requireRole(['Super Admin', 'Admin', 'Order Manager']), orderController.createPurchaseOrder);
router.put('/orders/purchase-orders/:id/status', authenticateToken, requireRole(['Super Admin', 'Admin', 'Order Manager']), orderController.updatePurchaseOrderStatus);

// ==========================================
// 4. USER ENDPOINTS
// ==========================================
router.get('/users', authenticateToken, requireRole(['Super Admin', 'Admin']), userController.getUsers);
router.post('/users', authenticateToken, requireRole(['Super Admin', 'Admin']), userController.createUser);
router.put('/users/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), userController.updateUser);
router.delete('/users/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), userController.deleteUser);

// ==========================================
// 5. SUPPLIERS (VENDORS) ENDPOINTS
// ==========================================
router.get('/suppliers', authenticateToken, supplierController.getSuppliers);
router.post('/suppliers', authenticateToken, requireRole(['Super Admin', 'Admin', 'Supplier Manager']), supplierController.createSupplier);
router.put('/suppliers/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Supplier Manager']), supplierController.updateSupplier);
router.delete('/suppliers/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), supplierController.deleteSupplier);
router.get('/suppliers/:id/analytics', authenticateToken, supplierController.getSupplierAnalytics);

// ==========================================
// 6. CATEGORIES ENDPOINTS
// ==========================================
router.get('/categories', authenticateToken, categoryController.getCategories);
router.post('/categories', authenticateToken, requireRole(['Super Admin', 'Admin', 'Inventory Manager']), categoryController.createCategory);
router.put('/categories/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Inventory Manager']), categoryController.updateCategory);
router.delete('/categories/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), categoryController.deleteCategory);

// ==========================================
// 7. DASHBOARD STATS
// ==========================================
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const totalBooks = await prisma.book.count();
    const totalOrders = await prisma.order.count();
    const pendingOrders = await prisma.order.count({ where: { status: 'Pending' } });
    
    // Revenue sum
    const orders = await prisma.order.findMany({ select: { amount: true } });
    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);

    const lowStockBooks = await prisma.book.count({
      where: { quantity: { lte: 5 } }
    });

    const shopifySynced = await prisma.book.count({
      where: {
        shopify_product_id: { not: null },
        sync_status: 'Synced'
      }
    });

    // Recent activities (Audit Logs)
    const recentActivities = await prisma.auditLog.findMany({
      take: 6,
      orderBy: { created_at: 'desc' },
      include: { user: { select: { first_name: true, last_name: true, email: true } } },
    });

    // Stock distribution metrics (Dummy Category groups)
    const books = await prisma.book.findMany({
      take: 200,
      select: { price: true, quantity: true, title: true }
    });

    return res.json({
      totalBooks,
      totalOrders,
      pendingOrders,
      totalRevenue,
      lowStockBooks,
      shopifySynced,
      recentActivities,
      booksDistribution: books.slice(0, 7), // Give frontend some sample items for visualization
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
});

// ==========================================
// 8. LOGS VIEWING (AUDIT & SYNC)
// ==========================================
router.get('/audit-logs', authenticateToken, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { created_at: 'desc' },
      include: { user: { select: { first_name: true, last_name: true, email: true } } }
    });
    return res.json(logs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
});

router.get('/sync-logs', authenticateToken, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const logs = await prisma.syncLog.findMany({
      take: 50,
      orderBy: { created_at: 'desc' },
    });
    return res.json(logs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
});

export default router;
