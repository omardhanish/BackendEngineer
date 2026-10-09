import {
  pgTable, serial, text, integer, index, getTableConfig,
} from 'drizzle-orm/pg-core';

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  year: integer('year'),
}, (table) => [index('books_title_idx').on(table.title)]);

const { indexes } = getTableConfig(books);
console.log(indexes.map((i) => i.config.name));
