import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Clean existing tables
  await prisma.auditLog.deleteMany({});
  await prisma.syncLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.book.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Default Users
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  
  const superAdmin = await prisma.user.create({
    data: {
      first_name: 'Super',
      last_name: 'Admin',
      email: 'admin@bookhive.com',
      password: hashedPassword,
      role: 'Super Admin',
      is_active: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      first_name: 'Alex',
      last_name: 'Porter',
      email: 'manager@bookhive.com',
      password: hashedPassword,
      role: 'Inventory Manager',
      is_active: true,
    },
  });

  console.log(`- Seeded users: ${superAdmin.email}, ${manager.email}`);

  // 3. Create Categories
  const categoryTech = await prisma.category.create({
    data: {
      name: 'Technology',
      seo_title: 'Tech & Development Books',
      seo_description: 'Software development, AI, Cloud computing, and programming languages.',
    },
  });

  const categoryBiz = await prisma.category.create({
    data: {
      name: 'Business & Finance',
      seo_title: 'Business, Startups and Stocks',
      seo_description: 'Insights into finance management, entrepreneurship, and economics.',
    },
  });

  const categorySci = await prisma.category.create({
    data: {
      name: 'Science & Fiction',
      seo_title: 'Sci-fi Classics',
      seo_description: 'Bestselling sci-fi novels and classic fantasy sagas.',
    },
  });

  console.log('- Seeded root categories.');

  // 4. Create Suppliers
  const supplierIngram = await prisma.supplier.create({
    data: {
      name: 'Ingram Content Group',
      email: 'procurement@ingramcontent.com',
      phone: '+1-800-937-8000',
      address: '1 Ingram Blvd, La Vergne, TN 37086, USA',
      tax_id: 'TX-99887766',
      website: 'https://ingramcontent.com',
      notes: 'Primary supplier for technology and software publications.',
    },
  });

  const supplierBaker = await prisma.supplier.create({
    data: {
      name: 'Baker & Taylor',
      email: 'orders@baker-taylor.com',
      phone: '+1-800-775-1800',
      address: '2550 West Tyvola Rd, Charlotte, NC 28217, USA',
      tax_id: 'TX-11223344',
      website: 'https://baker-taylor.com',
      notes: 'Alternative supplier for general interest and fiction books.',
    },
  });

  console.log('- Seeded suppliers.');

  // 5. Create Sample Books
  const booksData = [
    {
      isbn: '9780132350884',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      description: 'A handbook of agile software craftsmanship. The standard blueprint for high-quality engineering.',
      price: 44.99,
      shopify_price: 49.99,
      quantity: 12,
      sku: 'BOOK-CLEAN-CODE',
      barcode: '9780132350884',
      tags: 'programming,engineering,refactoring',
      status: 'Active',
      category_id: categoryTech.id,
      vendor_id: supplierIngram.id,
    },
    {
      isbn: '9780135957059',
      title: 'The Pragmatic Programmer',
      author: 'David Thomas, Andrew Hunt',
      description: 'Your journey to mastery. One of the most significant books on software development ever published.',
      price: 39.95,
      shopify_price: 44.95,
      quantity: 4, // Low stock!
      sku: 'BOOK-PRAGMATIC-PROG',
      barcode: '9780135957059',
      tags: 'career,programming,productivity',
      status: 'Active',
      category_id: categoryTech.id,
      vendor_id: supplierIngram.id,
    },
    {
      isbn: '9780062316097',
      title: 'Sapiens: A Brief History of Humankind',
      author: 'Yuval Noah Harari',
      description: 'Retells the history of humankind from the evolutionary perspective.',
      price: 24.99,
      shopify_price: 27.50,
      quantity: 25,
      sku: 'BOOK-SAPIENS',
      barcode: '9780062316097',
      tags: 'history,philosophy,evolution',
      status: 'Active',
      category_id: categoryBiz.id,
      vendor_id: supplierBaker.id,
    },
    {
      isbn: '9780307887894',
      title: 'The Lean Startup',
      author: 'Eric Ries',
      description: 'How constant innovation creates radically successful businesses.',
      price: 18.00,
      shopify_price: 19.99,
      quantity: 15,
      sku: 'BOOK-LEAN-STARTUP',
      barcode: '9780307887894',
      tags: 'business,startups,agile',
      status: 'Active',
      category_id: categoryBiz.id,
      vendor_id: supplierBaker.id,
    },
    {
      isbn: '9780451524935',
      title: '1984',
      author: 'George Orwell',
      description: 'Classic dystopian novel about total surveillance and authoritarian control.',
      price: 9.99,
      shopify_price: 12.00,
      quantity: 0, // Out of stock!
      sku: 'BOOK-1984',
      barcode: '9780451524935',
      tags: 'dystopian,classic,fiction',
      status: 'Active',
      category_id: categorySci.id,
      vendor_id: supplierBaker.id,
    }
  ];

  for (const b of booksData) {
    const book = await prisma.book.create({
      data: b,
    });
    console.log(`  + Created book: ${book.title}`);
  }

  // 6. Create initial dummy orders
  const sampleOrder = await prisma.order.create({
    data: {
      order_number: 'BH-1001',
      customer_name: 'Michael Scott',
      customer_email: 'michael.scott@dundermifflin.com',
      amount: 89.98,
      status: 'Pending',
      delivery_method: 'Standard Shipping',
    }
  });

  const bookCleanCode = await prisma.book.findFirst({ where: { sku: 'BOOK-CLEAN-CODE' } });
  if (bookCleanCode) {
    await prisma.orderItem.create({
      data: {
        order_id: sampleOrder.id,
        book_id: bookCleanCode.id,
        quantity: 2,
        price: bookCleanCode.price,
      }
    });
  }

  console.log('- Seeded sample order.');
  console.log('Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database: ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
