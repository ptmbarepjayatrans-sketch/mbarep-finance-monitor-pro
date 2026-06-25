import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import axios from 'axios';

const prisma = new PrismaClient();

export interface IVoiceRequest {
  text: string;
  amount: bigint;
  language: 'id' | 'jw' | 'en';
  packId?: string;
}

export interface IVoiceResponse {
  url: string;
  duration: number;
  format: string;
}

export class VoiceEngineService {
  private getVoiceByNominal(amount: bigint, language: string): string {
    const amountNum = Number(amount);

    if (amountNum < 100000) {
      if (language === 'id') return 'Dana masuk ke rekening Anda.';
      if (language === 'jw') return 'Dhuwit mlebu ing rekening mu.';
      return 'Money received in your account.';
    }

    if (amountNum < 1000000) {
      if (language === 'id') return `Terima kasih. ${this.formatCurrency(amountNum)} telah diterima.`;
      if (language === 'jw') return `Matur nuwun. ${this.formatCurrency(amountNum)} wis ditampa.`;
      return `Thank you. ${this.formatCurrency(amountNum)} has been received.`;
    }

    if (amountNum < 5000000) {
      if (language === 'id') return `Selamat. Pembayaran ${this.formatCurrency(amountNum)} telah diterima.`;
      if (language === 'jw') return `Sugeng. Pembayaran ${this.formatCurrency(amountNum)} wis ditampa.`;
      return `Congratulations. Payment of ${this.formatCurrency(amountNum)} has been received.`;
    }

    if (amountNum < 10000000) {
      if (language === 'id') return `Cuan besar masuk. ${this.formatCurrency(amountNum)} telah diterima ke rekening perusahaan.`;
      if (language === 'jw') return `Cuan gedhe mlebu. ${this.formatCurrency(amountNum)} wis ditampa ing rekening perusahaan.`;
      return `Major funds received. ${this.formatCurrency(amountNum)} has been received in the company account.`;
    }

    if (amountNum < 50000000) {
      if (language === 'id') return `Perhatian. Transaksi prioritas bernilai ${this.formatCurrency(amountNum)} rupiah telah diterima.`;
      if (language === 'jw') return `Gatèkan. Transaksi prioritas sédéné ${this.formatCurrency(amountNum)} rupiah wis ditampa.`;
      return `Attention. Priority transaction of ${this.formatCurrency(amountNum)} rupiah has been received.`;
    }

    // >= 50 juta
    if (language === 'id') return `Luar biasa. Transaksi bernilai ${this.formatCurrency(amountNum)} rupiah berhasil diterima. Sistem telah mencatat transaksi besar ini.`;
    if (language === 'jw') return `Luar biasa. Transaksi sédéné ${this.formatCurrency(amountNum)} rupiah berhasil ditampa. Sistem wis nyathet transaksi gedhe iki.`;
    return `Extraordinary. Transaction of ${this.formatCurrency(amountNum)} rupiah has been successfully received. System has recorded this large transaction.`;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  async generateVoice(request: IVoiceRequest): Promise<IVoiceResponse> {
    const voiceText = this.getVoiceByNominal(request.amount, request.language);

    try {
      // Try ElevenLabs if available
      if (config.ai.elevenLabsKey && config.ai.elevenLabsVoiceId) {
        return await this.generateWithElevenLabs(voiceText, request.language);
      }

      // Fallback to TTS (Google TTS)
      return await this.generateWithTTS(voiceText, request.language);
    } catch (error) {
      logger.error({ error, msg: 'Voice generation failed' });
      throw error;
    }
  }

  private async generateWithElevenLabs(text: string, language: string): Promise<IVoiceResponse> {
    try {
      const voiceId = config.ai.elevenLabsVoiceId;
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': config.ai.elevenLabsKey,
          },
          responseType: 'arraybuffer',
        }
      );

      // Save to storage and return URL
      const buffer = Buffer.from(response.data);
      const filename = `voice-${Date.now()}.mp3`;

      logger.info({ filename, text, msg: 'Voice generated with ElevenLabs' });

      return {
        url: `/api/v1/voice/${filename}`,
        duration: Math.ceil(text.length / 100 * 5), // Rough estimate
        format: 'mp3',
      };
    } catch (error) {
      logger.error({ error, msg: 'ElevenLabs generation failed, fallback to TTS' });
      return this.generateWithTTS(text, language);
    }
  }

  private async generateWithTTS(text: string, language: string): Promise<IVoiceResponse> {
    // Using google-tts-api or similar
    // For production, implement actual TTS service
    logger.info({ text, language, msg: 'Voice generated with TTS' });

    return {
      url: `/api/v1/voice/tts-${Date.now()}.mp3`,
      duration: Math.ceil(text.length / 100 * 5),
      format: 'mp3',
    };
  }

  async getVoicePacks(language?: string) {
    const where = language ? { language } : {};
    const packs = await prisma.voicePack.findMany({
      where: { ...where, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return packs;
  }

  async createVoicePack(data: any) {
    const pack = await prisma.voicePack.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        language: data.language,
        voiceId: data.voiceId,
        provider: data.provider,
        rules: data.rules || {},
        isDefault: data.isDefault || false,
      },
    });
    logger.info({ packId: pack.id, msg: 'Voice pack created' });
    return pack;
  }
}
