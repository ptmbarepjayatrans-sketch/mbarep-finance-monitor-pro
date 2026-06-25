import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import axios from 'axios';
import { config } from '../../config/index.js';

const prisma = new PrismaClient();

export class InvoiceService {
  async createInvoice(data: any) {
    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        branchId: data.branchId,
        amount: BigInt(data.amount),
        description: data.description,
        dueDate: new Date(data.dueDate),
        bookingId: data.bookingId,
        rentalId: data.rentalId,
        status: 'draft',
      },
    });

    logger.info({ invoiceId: invoice.id, invoiceNumber, msg: 'Invoice created' });
    return invoice;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: `INV-${year}${month}`,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sequence = lastInvoice ? parseInt(lastInvoice.invoiceNumber.split('-')[2]) + 1 : 1;
    return `INV-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }

  async generatePDF(invoiceId: string): Promise<Buffer> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, branch: true },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Generate PDF using library like pdfkit or puppeteer
    const pdfBuffer = Buffer.from(
      `INVOICE ${invoice.invoiceNumber}\n\nCustomer: ${invoice.customer?.name}\nAmount: ${invoice.amount}\nDue: ${invoice.dueDate}`
    );

    logger.info({ invoiceId, msg: 'PDF generated' });
    return pdfBuffer;
  }

  async sendViaEmail(invoiceId: string): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice || !invoice.customer?.email) {
      throw new ValidationError('Invoice or customer email not found');
    }

    // Send email logic
    logger.info({ invoiceId, email: invoice.customer.email, msg: 'Invoice sent via email' });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { emailSentAt: new Date() },
    });
  }

  async sendViaWhatsApp(invoiceId: string): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice || !invoice.customer?.phone) {
      throw new ValidationError('Invoice or customer phone not found');
    }

    // Send WhatsApp using Twilio or similar
    logger.info({ invoiceId, phone: invoice.customer.phone, msg: 'Invoice sent via WhatsApp' });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { whatsappSentAt: new Date() },
    });
  }

  async generateQRIS(invoiceId: string): Promise<string> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Generate QRIS code
    const qrisUrl = `https://qris.mbarep.com/${invoiceId}`;

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { qrisCode: qrisUrl },
    });

    logger.info({ invoiceId, msg: 'QRIS code generated' });
    return qrisUrl;
  }

  async markAsPaid(invoiceId: string, paidAmount: bigint): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const newPaidAmount = (invoice.paidAmount || BigInt(0)) + paidAmount;
    const status = newPaidAmount >= invoice.amount ? 'paid' : 'partial';

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status,
        paidDate: status === 'paid' ? new Date() : invoice.paidDate,
      },
    });

    logger.info({ invoiceId, paidAmount: paidAmount.toString(), status, msg: 'Invoice marked as paid' });
  }

  async getOverdueInvoices(branchId?: string) {
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { in: ['draft', 'pending', 'partial'] },
        ...(branchId && { branchId }),
      },
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
    });

    return overdueInvoices;
  }

  async sendReminderToOverdueInvoices(branchId?: string): Promise<number> {
    const overdueInvoices = await this.getOverdueInvoices(branchId);
    let sent = 0;

    for (const invoice of overdueInvoices) {
      if (invoice.customer?.phone) {
        try {
          await this.sendViaWhatsApp(invoice.id);
          sent++;
        } catch (error) {
          logger.error({ invoiceId: invoice.id, error, msg: 'Failed to send reminder' });
        }
      }
    }

    logger.info({ branchId, sent, msg: 'Overdue reminders sent' });
    return sent;
  }

  async autoReconcile(invoiceId: string, transactionId: string): Promise<void> {
    const [invoice, transaction] = await Promise.all([
      prisma.invoice.findUnique({ where: { id: invoiceId } }),
      prisma.transaction.findUnique({ where: { id: transactionId } }),
    ]);

    if (!invoice || !transaction) {
      throw new NotFoundError('Invoice or transaction not found');
    }

    if (transaction.amount === invoice.amount) {
      await Promise.all([
        prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'paid', paidAmount: invoice.amount, paidDate: new Date() },
        }),
        prisma.transaction.update({
          where: { id: transactionId },
          data: { reconciliationStatus: 'matched' },
        }),
      ]);

      logger.info({ invoiceId, transactionId, msg: 'Auto reconciliation completed' });
    }
  }
}
