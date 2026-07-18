import { Inject } from "@nestjs/common";
import { SQL, eq, and, isNull, desc, asc, count } from "drizzle-orm"
import { PgTableWithColumns, TableConfig } from "drizzle-orm/pg-core";
import { DRIZZLE_CLIENT, type DrizzleDB } from '../drizzle.module';

/**
 * BaseRepository<T> — typed Drizzle ORM base repository.
 *
 * Unlike TypeORM's BaseRepository, Drizzle requires you to pass
 * the table reference explicitly because Drizzle is SQL-first —
 * there is no hidden "EntityManager" magic.
 *
 * Usage:
 *   class UsersRepository extends BaseRepository<typeof users> {
 *     constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleDB) {
 *       super(db, users);
 *     }
 *   }
 */
export abstract class BaseRepository<T extends PgTableWithColumns<TableConfig>> {
  constructor(
    @Inject(DRIZZLE_CLIENT) protected readonly db: DrizzleDB,
    protected readonly table: T,
  ) {}

  async findById(id: string): Promise<T['$inferSelect'] | null> {
    const rows = await this.db
      .select()
      .from(this.table as any)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return (rows[0] ?? null) as T['$inferSelect'] | null;
  }

  async findAll(where?: SQL, limit = 50, offset = 0): Promise<T['$inferSelect'][]> {
    let query = this.db.select().from(this.table as any).$dynamic();
    if (where) query = query.where(where);
    return query.limit(limit).offset(offset) as Promise<T['$inferSelect'][]>;
  }

  async insert(data: T['$inferInsert']): Promise<T['$inferSelect']> {
    const rows = await this.db
      .insert(this.table as any)
      .values(data as any)
      .returning();
    return rows[0] as T['$inferSelect'];
  }

  async updateById(id: string, data: Partial<T['$inferInsert']>): Promise<T['$inferSelect'] | null> {
    const rows = await this.db
      .update(this.table as any)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq((this.table as any).id, id))
      .returning();
    return (rows[0] ?? null) as T['$inferSelect'] | null;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(this.table as any)
      .set({ deletedAt: new Date() } as any)
      .where(eq((this.table as any).id, id));
  }

  async hardDelete(id: string): Promise<void> {
    await this.db
      .delete(this.table as any)
      .where(eq((this.table as any).id, id));
  }

  async countWhere(where?: SQL): Promise<number> {
    let query = this.db.select({ count: count() }).from(this.table as any).$dynamic();
    if (where) query = query.where(where);
    const result = await query;
    return Number(result[0]?.count ?? 0);
  }

  async exists(where: SQL): Promise<boolean> {
    const rows = await this.db
      .select({ id: (this.table as any).id })
      .from(this.table as any)
      .where(where)
      .limit(1);
    return rows.length > 0;
  }

  /**
   * Transaction helper — pass a callback that uses the tx client.
   * The transaction commits on success and rolls back on exception.
   */
  async transaction<R>(fn: (tx: DrizzleDB) => Promise<R>): Promise<R> {
    return this.db.transaction(fn as any);
  }
}
