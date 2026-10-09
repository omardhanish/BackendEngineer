import { Router } from 'express';
import * as books from '../controllers/books.controller.js';

const router = Router();

router.get('/', books.listBooks);
router.get('/:id', books.getBook);
router.post('/', books.createBook);
router.put('/:id', books.updateBook);
router.delete('/:id', books.deleteBook);

export default router;
