import { NextResponse } from 'next/server';
import { parseScoreboardWithVision } from '@/lib/vision';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let imageDataUrl = '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      imageDataUrl = body.image || body.imageUrl || '';
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const mimeType = file.type || 'image/jpeg';
        imageDataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    }

    if (!imageDataUrl) {
      return NextResponse.json(
        { error: 'Sila muat naik imej atau sertakan base64 image data URL.' },
        { status: 400 }
      );
    }

    const scanResult = await parseScoreboardWithVision(imageDataUrl);
    return NextResponse.json(scanResult);
  } catch (error: any) {
    console.error('[Vision Parse API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses imej dengan AI Vision.' },
      { status: 500 }
    );
  }
}
