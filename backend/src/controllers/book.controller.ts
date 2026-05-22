import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';
import { QueueService } from '../queues/queue.service';
import { bookSchema } from '../validators/schemas';

export const getBooks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search = '',
      status,
      category_id,
      vendor_id,
      lowStock = 'false',
      sortBy = 'title',
      sortOrder = 'asc',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Filters
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } },
        { isbn: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as string;
    }

    if (category_id) {
      where.category_id = parseInt(category_id as string, 10);
    }

    if (vendor_id) {
      where.vendor_id = parseInt(vendor_id as string, 10);
    }

    if (lowStock === 'true') {
      where.quantity = { lte: 5 }; // Define low stock threshold as 5 or less
    }

    // Query DB
    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          category: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
        },
        orderBy: {
          [sortBy as string]: sortOrder as string,
        },
      }),
      prisma.book.count({ where }),
    ]);

    return res.json({
      books,
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

export const getBookById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const book = await prisma.book.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        category: true,
        vendor: true,
      },
    });
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    return res.json(book);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const createBook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = bookSchema.parse(req.body);

    // Double check ISBN uniqueness
    const existing = await prisma.book.findFirst({
      where: { isbn: validated.isbn }
    });
    if (existing) {
      return res.status(400).json({ message: 'A book with this ISBN already exists' });
    }

    const book = await prisma.book.create({
      data: {
        isbn: validated.isbn,
        title: validated.title,
        author: validated.author,
        description: validated.description,
        category_id: validated.category_id,
        vendor_id: validated.vendor_id,
        price: validated.price,
        shopify_price: validated.shopify_price || validated.price,
        quantity: validated.quantity,
        weight: validated.weight,
        publisher: validated.publisher,
        language: validated.language,
        sku: validated.sku,
        barcode: validated.barcode,
        tags: validated.tags,
        status: validated.status,
        dimensions: validated.dimensions,
        image_url: validated.image_url,
        sync_status: 'Pending',
      },
    });

    // Log Action
    await AuditService.log(
      req.user?.id || null,
      'BOOK_CREATE',
      `Created book "${book.title}" (ISBN: ${book.isbn})`,
      req.ip
    );

    // Trigger Shopify background sync
    await QueueService.addShopifySyncJob(book.id, 'create');

    return res.status(201).json(book);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || error });
  }
};

export const updateBook = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const validated = bookSchema.parse(req.body);
    const bookId = parseInt(id, 10);

    const existing = await prisma.book.findUnique({ where: { id: bookId } });
    if (!existing) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: {
        isbn: validated.isbn,
        title: validated.title,
        author: validated.author,
        description: validated.description,
        category_id: validated.category_id,
        vendor_id: validated.vendor_id,
        price: validated.price,
        shopify_price: validated.shopify_price || validated.price,
        quantity: validated.quantity,
        weight: validated.weight,
        publisher: validated.publisher,
        language: validated.language,
        sku: validated.sku,
        barcode: validated.barcode,
        tags: validated.tags,
        status: validated.status,
        dimensions: validated.dimensions,
        image_url: validated.image_url,
        sync_status: 'Pending',
      },
    });

    await AuditService.log(
      req.user?.id || null,
      'BOOK_UPDATE',
      `Updated book "${updated.title}"`,
      req.ip
    );

    // Trigger Shopify background sync
    await QueueService.addShopifySyncJob(updated.id, 'update');

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || error });
  }
};

export const deleteBook = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const bookId = parseInt(id, 10);
    const book = await prisma.book.findUnique({ where: { id: bookId } });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Delete in Shopify
    if (book.shopify_product_id) {
      await QueueService.addShopifySyncJob(bookId, 'delete');
    }

    await prisma.book.delete({ where: { id: bookId } });

    await AuditService.log(
      req.user?.id || null,
      'BOOK_DELETE',
      `Deleted book "${book.title}" (ISBN: ${book.isbn})`,
      req.ip
    );

    return res.json({ message: 'Book deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const syncBookToShopify = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const bookId = parseInt(id, 10);
    const book = await prisma.book.findUnique({ where: { id: bookId } });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Trigger Shopify sync immediately in background queue
    await QueueService.addShopifySyncJob(bookId, 'update');

    return res.json({ message: 'Shopify sync job enqueued successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};

export const importBooks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { books } = req.body;
    if (!Array.isArray(books)) {
      return res.status(400).json({ message: 'Invalid payload: "books" must be an array' });
    }

    const createdBooks = [];
    for (const b of books) {
      try {
        // Simple manual parsing & validation
        const priceNum = parseFloat(b.price) || 0.0;
        const qtyNum = parseInt(b.quantity, 10) || 0;
        
        // Find if ISBN exists
        const existing = await prisma.book.findFirst({ where: { isbn: String(b.isbn) } });
        if (existing) continue;

        const newBook = await prisma.book.create({
          data: {
            isbn: String(b.isbn),
            title: String(b.title || 'Untitled Book'),
            author: String(b.author || 'Unknown Author'),
            description: b.description ? String(b.description) : null,
            price: priceNum,
            quantity: qtyNum,
            sku: b.sku ? String(b.sku) : String(b.isbn),
            status: 'Active',
          },
        });
        createdBooks.push(newBook);
        await QueueService.addShopifySyncJob(newBook.id, 'create');
      } catch (err) {
        // Skip invalid rows during import
      }
    }

    await AuditService.log(
      req.user?.id || null,
      'BOOK_IMPORT',
      `Imported ${createdBooks.length} books via CSV/Excel payload`,
      req.ip
    );

    return res.status(201).json({
      message: `Successfully imported ${createdBooks.length} books and scheduled Shopify syncing.`,
      importedCount: createdBooks.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error });
  }
};
