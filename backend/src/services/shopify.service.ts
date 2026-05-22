import { logger } from '../utils/logger';
import { prisma } from '../config/db';

export class ShopifyService {
  private static getCredentials() {
    return {
      storeUrl: process.env.SHOPIFY_STORE_URL,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    };
  }

  private static isConfigured(): boolean {
    const { storeUrl, accessToken } = this.getCredentials();
    return !!(storeUrl && accessToken && !storeUrl.includes('placeholder'));
  }

  private static async getFirstLocationId(endpoint: string, accessToken: string): Promise<string> {
    const query = `
      query {
        locations(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query }),
    });
    const resBody: any = await response.json();
    if (resBody.errors) {
      throw new Error(`Failed to query locations: ${JSON.stringify(resBody.errors)}`);
    }
    const locationId = resBody.data?.locations?.edges[0]?.node?.id;
    if (!locationId) {
      throw new Error('No active locations found in your Shopify store. Please configure at least one location.');
    }
    return locationId;
  }

  private static async setInventoryQuantity(endpoint: string, accessToken: string, inventoryItemId: string, locationId: string, quantity: number) {
    const inventoryQuery = `
      mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          userErrors {
            field
            message
          }
        }
      }
    `;

    const inventoryVariables = {
      input: {
        name: 'available',
        reason: 'correction',
        ignoreCompareQuantity: true,
        quantities: [
          {
            inventoryItemId,
            locationId,
            quantity,
          }
        ]
      }
    };

    const inventoryResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query: inventoryQuery, variables: inventoryVariables }),
    });

    const inventoryResBody: any = await inventoryResponse.json();
    if (inventoryResBody.errors || (inventoryResBody.data?.inventorySetQuantities?.userErrors && inventoryResBody.data.inventorySetQuantities.userErrors.length > 0)) {
      const errorMsg = inventoryResBody.errors ? JSON.stringify(inventoryResBody.errors) : JSON.stringify(inventoryResBody.data.inventorySetQuantities.userErrors);
      throw new Error(`Failed to set inventory quantity: ${errorMsg}`);
    }
  }

  static async createProduct(bookId: number) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { category: true, vendor: true },
    });

    if (!book) {
      throw new Error(`Book with ID ${bookId} not found`);
    }

    if (!this.isConfigured()) {
      logger.info(`[Shopify Mock] Creating product for book: "${book.title}"`);
      // Simulate API lag and return mock Shopify credentials
      const mockProductId = `gid://shopify/Product/${Math.floor(100000000 + Math.random() * 900000000)}`;
      const mockVariantId = `gid://shopify/ProductVariant/${Math.floor(100000000 + Math.random() * 900000000)}`;
      
      await prisma.book.update({
        where: { id: bookId },
        data: {
          shopify_product_id: mockProductId,
          shopify_variant_id: mockVariantId,
          sync_status: 'Synced',
        },
      });

      await prisma.syncLog.create({
        data: {
          type: 'BookSync',
          status: 'Success',
          message: `Simulated Shopify Sync for: "${book.title}" (ISBN: ${book.isbn})`,
        },
      });

      return { shopifyProductId: mockProductId, shopifyVariantId: mockVariantId };
    }

    const { storeUrl, accessToken } = this.getCredentials();
    const endpoint = `https://${storeUrl}/admin/api/2024-04/graphql.json`;

    try {
      // 1. Query active location ID
      const locationId = await this.getFirstLocationId(endpoint, accessToken!);

      // 2. Create the product
      const productQuery = `
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              variants(first: 1) {
                edges {
                  node {
                    id
                    inventoryItem {
                      id
                    }
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const productVariables = {
        input: {
          title: book.title,
          descriptionHtml: book.description || '',
          vendor: book.vendor?.name || 'BookHive Vendor',
          productType: book.category?.name || 'Books',
          status: book.status === 'Active' ? 'ACTIVE' : 'DRAFT',
          tags: book.tags ? book.tags.split(',') : [],
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken!,
        },
        body: JSON.stringify({ query: productQuery, variables: productVariables }),
      });

      const resBody: any = await response.json();
      if (resBody.errors || (resBody.data?.productCreate?.userErrors && resBody.data.productCreate.userErrors.length > 0)) {
        const errorMsg = resBody.errors ? JSON.stringify(resBody.errors) : JSON.stringify(resBody.data.productCreate.userErrors);
        throw new Error(errorMsg);
      }

      const product = resBody.data.productCreate.product;
      const variantNode = product.variants.edges[0]?.node;
      const variantId = variantNode?.id;
      const inventoryItemId = variantNode?.inventoryItem?.id;

      // 3. Update the default variant with price, SKU, barcode
      const variantUpdateQuery = `
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variantUpdateVariables = {
        productId: product.id,
        variants: [
          {
            id: variantId,
            price: (book.shopify_price || book.price).toString(),
            barcode: book.barcode || book.isbn,
            inventoryItem: {
              sku: book.sku || book.isbn,
            }
          }
        ]
      };

      const bulkResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken!,
        },
        body: JSON.stringify({ query: variantUpdateQuery, variables: variantUpdateVariables }),
      });

      const bulkResBody: any = await bulkResponse.json();
      if (bulkResBody.errors || (bulkResBody.data?.productVariantsBulkUpdate?.userErrors && bulkResBody.data.productVariantsBulkUpdate.userErrors.length > 0)) {
        const errorMsg = bulkResBody.errors ? JSON.stringify(bulkResBody.errors) : JSON.stringify(bulkResBody.data.productVariantsBulkUpdate.userErrors);
        throw new Error(`Failed to update variants: ${errorMsg}`);
      }

      // 4. Update the inventory quantity using inventoryActivate (with fallback to inventorySetQuantities)
      if (inventoryItemId) {
        try {
          const activateQuery = `
            mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!, $available: Int) {
              inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
                userErrors {
                  field
                  message
                }
              }
            }
          `;
          const activateVariables = {
            inventoryItemId,
            locationId,
            available: book.quantity,
          };
          
          const actResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken!,
            },
            body: JSON.stringify({ query: activateQuery, variables: activateVariables }),
          });
          
          const actResBody: any = await actResponse.json();
          if (actResBody.errors || (actResBody.data?.inventoryActivate?.userErrors && actResBody.data.inventoryActivate.userErrors.length > 0)) {
            const errorMsg = actResBody.errors ? JSON.stringify(actResBody.errors) : JSON.stringify(actResBody.data.inventoryActivate.userErrors);
            if (errorMsg.includes('already active') || errorMsg.includes('already activated') || errorMsg.includes('already stocked')) {
              await this.setInventoryQuantity(endpoint, accessToken!, inventoryItemId, locationId, book.quantity);
            } else {
              throw new Error(errorMsg);
            }
          }
        } catch (err: any) {
          const errMsg = err.message || String(err);
          if (errMsg.includes('already active') || errMsg.includes('already activated') || errMsg.includes('already stocked')) {
            await this.setInventoryQuantity(endpoint, accessToken!, inventoryItemId, locationId, book.quantity);
          } else {
            throw err;
          }
        }
      }

      // 5. Update local database
      await prisma.book.update({
        where: { id: bookId },
        data: {
          shopify_product_id: product.id,
          shopify_variant_id: variantId || null,
          sync_status: 'Synced',
        },
      });

      await prisma.syncLog.create({
        data: {
          type: 'BookSync',
          status: 'Success',
          message: `Successfully Synced Book: "${book.title}" with Shopify`,
        },
      });

      return { shopifyProductId: product.id, shopifyVariantId: variantId };
    } catch (error: any) {
      await prisma.book.update({
        where: { id: bookId },
        data: { sync_status: 'Failed' },
      });

      await prisma.syncLog.create({
        data: {
          type: 'BookSync',
          status: 'Failed',
          message: `Failed to Sync "${book.title}" to Shopify: ${error.message || error}`,
        },
      });
      throw error;
    }
  }

  static async updateProduct(bookId: number) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book || !book.shopify_product_id) {
      // If it doesn't have a Shopify ID yet, run create instead
      return this.createProduct(bookId);
    }

    if (!this.isConfigured()) {
      logger.info(`[Shopify Mock] Updating product for book: "${book.title}"`);
      await prisma.book.update({
        where: { id: bookId },
        data: { sync_status: 'Synced' },
      });
      await prisma.syncLog.create({
        data: {
          type: 'BookSync',
          status: 'Success',
          message: `Simulated update sync for: "${book.title}"`,
        },
      });
      return;
    }

    const { storeUrl, accessToken } = this.getCredentials();
    const endpoint = `https://${storeUrl}/admin/api/2024-04/graphql.json`;

    try {
      // 1. Query active location ID
      const locationId = await this.getFirstLocationId(endpoint, accessToken!);

      // 2. Update the product core details
      const productQuery = `
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const productVariables = {
        input: {
          id: book.shopify_product_id,
          title: book.title,
          descriptionHtml: book.description || '',
          status: book.status === 'Active' ? 'ACTIVE' : 'DRAFT',
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken!,
        },
        body: JSON.stringify({ query: productQuery, variables: productVariables }),
      });

      const resBody: any = await response.json();
      if (resBody.errors || (resBody.data?.productUpdate?.userErrors && resBody.data.productUpdate.userErrors.length > 0)) {
        const errorMsg = resBody.errors ? JSON.stringify(resBody.errors) : JSON.stringify(resBody.data.productUpdate.userErrors);
        throw new Error(errorMsg);
      }

      // 3. Update the variant details
      const variantUpdateQuery = `
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              inventoryItem {
                id
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variantUpdateVariables = {
        productId: book.shopify_product_id,
        variants: [
          {
            id: book.shopify_variant_id,
            price: (book.shopify_price || book.price).toString(),
            barcode: book.barcode || book.isbn,
            inventoryItem: {
              sku: book.sku || book.isbn,
            }
          }
        ]
      };

      const bulkResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken!,
        },
        body: JSON.stringify({ query: variantUpdateQuery, variables: variantUpdateVariables }),
      });

      const bulkResBody: any = await bulkResponse.json();
      if (bulkResBody.errors || (bulkResBody.data?.productVariantsBulkUpdate?.userErrors && bulkResBody.data.productVariantsBulkUpdate.userErrors.length > 0)) {
        const errorMsg = bulkResBody.errors ? JSON.stringify(bulkResBody.errors) : JSON.stringify(bulkResBody.data.productVariantsBulkUpdate.userErrors);
        throw new Error(`Failed to update variants: ${errorMsg}`);
      }

      const variantNode = bulkResBody.data.productVariantsBulkUpdate.productVariants[0];
      const inventoryItemId = variantNode?.inventoryItem?.id;

      // 4. Update the inventory quantity using inventoryActivate (with fallback to inventorySetQuantities)
      if (inventoryItemId) {
        try {
          const activateQuery = `
            mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!, $available: Int) {
              inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
                userErrors {
                  field
                  message
                }
              }
            }
          `;
          const activateVariables = {
            inventoryItemId,
            locationId,
            available: book.quantity,
          };
          
          const actResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken!,
            },
            body: JSON.stringify({ query: activateQuery, variables: activateVariables }),
          });
          
          const actResBody: any = await actResponse.json();
          if (actResBody.errors || (actResBody.data?.inventoryActivate?.userErrors && actResBody.data.inventoryActivate.userErrors.length > 0)) {
            const errorMsg = actResBody.errors ? JSON.stringify(actResBody.errors) : JSON.stringify(actResBody.data.inventoryActivate.userErrors);
            if (errorMsg.includes('already active') || errorMsg.includes('already activated') || errorMsg.includes('already stocked')) {
              await this.setInventoryQuantity(endpoint, accessToken!, inventoryItemId, locationId, book.quantity);
            } else {
              throw new Error(errorMsg);
            }
          }
        } catch (err: any) {
          const errMsg = err.message || String(err);
          if (errMsg.includes('already active') || errMsg.includes('already activated') || errMsg.includes('already stocked')) {
            await this.setInventoryQuantity(endpoint, accessToken!, inventoryItemId, locationId, book.quantity);
          } else {
            throw err;
          }
        }
      }

      // 5. Update local database
      await prisma.book.update({
        where: { id: bookId },
        data: { sync_status: 'Synced' },
      });

      await prisma.syncLog.create({
        data: {
          type: 'BookSync',
          status: 'Success',
          message: `Updated Book details for: "${book.title}" on Shopify`,
        },
      });
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      if (errorMsg.includes('Product does not exist') || errorMsg.includes('not found') || errorMsg.includes('Invalid ID')) {
        logger.info(`Stale Shopify ID detected for "${book.title}". Clearing IDs and calling createProduct...`);
        await prisma.book.update({
          where: { id: bookId },
          data: {
            shopify_product_id: null,
            shopify_variant_id: null,
          },
        });
        return this.createProduct(bookId);
      }

      await prisma.book.update({
        where: { id: bookId },
        data: { sync_status: 'Failed' },
      });

      await prisma.syncLog.create({
        data: {
          type: 'BookSync',
          status: 'Failed',
          message: `Failed to update "${book.title}" on Shopify: ${errorMsg}`,
        },
      });
      throw error;
    }
  }

  static async deleteProduct(bookId: number) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book || !book.shopify_product_id) return;

    if (!this.isConfigured()) {
      logger.info(`[Shopify Mock] Deleting product with Shopify ID: ${book.shopify_product_id}`);
      return;
    }

    const { storeUrl, accessToken } = this.getCredentials();
    const endpoint = `https://${storeUrl}/admin/api/2024-04/graphql.json`;

    const query = `
      mutation productDelete($input: ProductDeleteInput!) {
        productDelete(input: $input) {
          deletedProductId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        id: book.shopify_product_id
      }
    };

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken!,
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (error) {
      logger.error(`Error deleting product from Shopify: ${error}`);
    }
  }
}
