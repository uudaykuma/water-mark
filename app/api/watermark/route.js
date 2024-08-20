import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

export async function POST(request) {
  try {
    const { file, text, type } = await request.json();

    let watermarkedBuffer;

    if (type === 'pdf') {
      // Process PDF file
      const pdfDoc = await PDFDocument.load(Buffer.from(file, 'base64'));
      const pages = pdfDoc.getPages();

      pages.forEach((page) => {
        const { width, height } = page.getSize();

        // Apply watermark repeatedly across the page
        const watermarkGap = 100;
        for (let y = 0; y < height; y += watermarkGap) {
          for (let x = 0; x < width; x += watermarkGap) {
            page.drawText(text, {
              x: x,
              y: y,
              size: 30,
              color: rgb(0.75, 0.75, 0.75),
              rotate: degrees(45),
              opacity: 0.5,
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
    } else if (type === 'jpg' || type === 'png') {
      // Process JPG/PNG image
      const image = sharp(Buffer.from(file, 'base64'));
      const { width, height } = await image.metadata();

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
                  }" font-size="30" fill="rgba(0, 0, 0, 0.5)"
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
        .composite([{ input: Buffer.from(svg), gravity: 'center' }])
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
    console.error("Watermark error:", error);
    return NextResponse.json({ error: 'Failed to add watermark', details: error.message }, { status: 500 });
  }
}
