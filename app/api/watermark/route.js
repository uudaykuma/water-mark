import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

export async function POST(request) {
  try {
    const { file, text, type } = await request.json();

    let watermarkedBuffer;

    if (type === 'pdf') {
      // Handle PDF watermarking
      const pdfDoc = await PDFDocument.load(Buffer.from(file, 'base64'));
      const pages = pdfDoc.getPages();

      pages.forEach((page) => {
        const { width, height } = page.getSize();

        const watermarkGap = 100;
        for (let y = 0; y < height; y += watermarkGap) {
          for (let x = 0; x < width; x += watermarkGap) {
            page.drawText(text, {
              x,
              y,
              size: 30,
              color: rgb(0.75, 0.75, 0.75),
              rotate: degrees(45),
              opacity: 0.25, // Lower opacity for background effect
            });
          }
        }
      });

      watermarkedBuffer = await pdfDoc.save();

      return new Response(watermarkedBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="watermarked.pdf"',
        },
      });
    } else if (type === 'jpg' || type === 'jpeg' || type === 'png') {
      // Handle JPG/PNG watermarking
      const image = sharp(Buffer.from(file, 'base64'));
      const metadata = await image.metadata();

      const { width, height } = metadata;
      const watermarkGap = 150;

      const svg = `
        <svg width="${width}" height="${height}">
          ${Array(Math.ceil(height / watermarkGap))
            .fill(0)
            .map((_, rowIndex) =>
              Array(Math.ceil(width / watermarkGap))
                .fill(0)
                .map(
                  (_, colIndex) => `
                    <text x="${colIndex * watermarkGap}" y="${
                    rowIndex * watermarkGap
                  }" font-size="30" fill="rgba(0, 0, 0, 0.1)"
                    transform="rotate(-45, ${
                      colIndex * watermarkGap
                    }, ${rowIndex * watermarkGap})">
                      ${text}
                    </text>
                  `
                )
                .join('')
            )
            .join('')}
        </svg>
      `;

      watermarkedBuffer = await image
        .composite([{ input: Buffer.from(svg), blend: 'multiply' }])
        .toBuffer();

      return new Response(watermarkedBuffer, {
        headers: {
          'Content-Type': `image/${type}`,
          'Content-Disposition': `attachment; filename="watermarked.${type}"`,
        },
      });
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Watermarking error:', error);
    return NextResponse.json({ error: 'Failed to add watermark', details: error.message }, { status: 500 });
  }
}
