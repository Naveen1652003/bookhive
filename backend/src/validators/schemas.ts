import { z } from 'zod';

export const registerSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Super Admin', 'Admin', 'Inventory Manager', 'Order Manager', 'Supplier Manager', 'Viewer']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const bookSchema = z.object({
  isbn: z.string().min(10, 'ISBN must be at least 10 characters'),
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  description: z.string().optional(),
  category_id: z.number().int().optional().nullable(),
  vendor_id: z.number().int().optional().nullable(),
  price: z.number().min(0, 'Price must be positive'),
  shopify_price: z.number().min(0, 'Shopify price must be positive').optional().nullable(),
  quantity: z.number().int().min(0, 'Quantity must be positive or zero'),
  weight: z.number().optional().nullable(),
  publisher: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  status: z.enum(['Draft', 'Active', 'Archived']).default('Draft'),
  dimensions: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});

export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const orderSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_email: z.string().email().optional().nullable(),
  amount: z.number().min(0),
  status: z.string().default('Pending'),
  delivery_method: z.string().optional(),
  items: z.array(z.object({
    book_id: z.number().int(),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
  })).min(1, 'At least one order item is required'),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  parent_id: z.number().int().optional().nullable(),
  image_url: z.string().optional().nullable(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
});
