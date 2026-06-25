import { Router, Request, Response, NextFunction } from 'express';
import { InvoiceService } from './invoice.service.js';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse } from '../../utils/response.js';

const router = Router();
const invoiceService = new InvoiceService();

router.use(authenticateToken);

// POST /invoices
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceService.createInvoice(req.body);
    res.status(201).json(createSuccessResponse('Invoice created', invoice));
  } catch (error) {
    next(error);
  }
});

// POST /invoices/:id/pdf
router.post('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pdf = await invoiceService.generatePDF(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

// POST /invoices/:id/send-email
router.post('/:id/send-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await invoiceService.sendViaEmail(req.params.id);
    res.json(createSuccessResponse('Invoice sent via email'));
  } catch (error) {
    next(error);
  }
});

// POST /invoices/:id/send-whatsapp
router.post('/:id/send-whatsapp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await invoiceService.sendViaWhatsApp(req.params.id);
    res.json(createSuccessResponse('Invoice sent via WhatsApp'));
  } catch (error) {
    next(error);
  }
});

// POST /invoices/:id/qris
router.post('/:id/qris', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qrisCode = await invoiceService.generateQRIS(req.params.id);
    res.json(createSuccessResponse('QRIS code generated', { qrisCode }));
  } catch (error) {
    next(error);
  }
});

// POST /invoices/:id/pay
router.post('/:id/pay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paidAmount } = req.body;
    await invoiceService.markAsPaid(req.params.id, BigInt(paidAmount));
    res.json(createSuccessResponse('Invoice marked as paid'));
  } catch (error) {
    next(error);
  }
});

// GET /invoices/overdue
router.get('/overdue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.query.branchId as string | undefined;
    const overdueInvoices = await invoiceService.getOverdueInvoices(branchId);
    res.json(createSuccessResponse('Overdue invoices retrieved', overdueInvoices));
  } catch (error) {
    next(error);
  }
});

// POST /invoices/overdue/remind
router.post('/overdue/remind', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.query.branchId as string | undefined;
    const sent = await invoiceService.sendReminderToOverdueInvoices(branchId);
    res.json(createSuccessResponse('Reminders sent', { sent }));
  } catch (error) {
    next(error);
  }
});

// POST /invoices/:id/reconcile
router.post('/:id/reconcile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionId } = req.body;
    await invoiceService.autoReconcile(req.params.id, transactionId);
    res.json(createSuccessResponse('Invoice reconciled'));
  } catch (error) {
    next(error);
  }
});

export const invoiceRouter = router;
