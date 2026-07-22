import { toMoney } from "@camoburguer/shared-types";

export function mapCatalogItem(row) {
  return {
    sku: row.sku,
    name: row.name,
    category: row.category,
    price: toMoney(row.price),
    description: row.description || "",
    stockCategory: row.stock_category,
    allowsAddons: row.allows_addons,
    preparationMode: row.preparation_mode,
    available: row.available,
    origin: row.origin,
    sourceVersion: row.source_version,
    archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export async function listCatalogItems(executor, { includeArchived = false } = {}) {
  const { rows } = await executor.query(
    `SELECT * FROM catalog_items${includeArchived ? "" : " WHERE archived_at IS NULL"}
     ORDER BY category, name, sku`
  );
  return rows.map(mapCatalogItem);
}

export async function lockCatalogItems(items, executor) {
  const skus = [...new Set((items || []).map((item) => String(item.sku || "").trim()).filter(Boolean))].sort();
  if (!skus.length) return [];
  const { rows } = await executor.query(
    `SELECT * FROM catalog_items
     WHERE sku = ANY($1::text[]) AND archived_at IS NULL
     ORDER BY sku FOR SHARE`,
    [skus]
  );
  return rows.map(mapCatalogItem);
}

export async function getCatalogItem(sku, executor, { forUpdate = false } = {}) {
  const { rows } = await executor.query(
    `SELECT * FROM catalog_items WHERE sku = $1${forUpdate ? " FOR UPDATE" : ""}`,
    [sku]
  );
  return rows[0] ? mapCatalogItem(rows[0]) : null;
}

export async function insertCatalogItem(item, executor) {
  const { rows } = await executor.query(
    `INSERT INTO catalog_items (
      sku, name, category, price, description, stock_category, allows_addons,
      preparation_mode, available, origin, source_version, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'operator',NULL,NOW(),NOW())
    RETURNING *`,
    [
      item.sku,
      item.name,
      item.category,
      item.price,
      item.description,
      item.stockCategory,
      item.allowsAddons,
      item.preparationMode,
      item.available
    ]
  );
  return mapCatalogItem(rows[0]);
}

export async function updateCatalogItem(sku, item, executor) {
  const { rows } = await executor.query(
    `UPDATE catalog_items SET
      name=$2, category=$3, price=$4, description=$5, stock_category=$6,
      allows_addons=$7, preparation_mode=$8, available=$9,
      updated_at=GREATEST(clock_timestamp(), updated_at + INTERVAL '1 millisecond')
     WHERE sku=$1 AND archived_at IS NULL RETURNING *`,
    [
      sku,
      item.name,
      item.category,
      item.price,
      item.description,
      item.stockCategory,
      item.allowsAddons,
      item.preparationMode,
      item.available
    ]
  );
  return rows[0] ? mapCatalogItem(rows[0]) : null;
}

export async function archiveCatalogItem(sku, executor) {
  const { rows } = await executor.query(
    `UPDATE catalog_items
     SET available=false,
         archived_at=COALESCE(archived_at, clock_timestamp()),
         updated_at=GREATEST(clock_timestamp(), updated_at + INTERVAL '1 millisecond')
     WHERE sku=$1 RETURNING *`,
    [sku]
  );
  return rows[0] ? mapCatalogItem(rows[0]) : null;
}
