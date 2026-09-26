import carbone from 'carbone';
import path from 'path';

export type SupportedFormat = 'pdf' | 'docx' | 'xlsx';

export class CarboneAdapter {
  generateDocument(templateName: string, data: any, format: SupportedFormat = 'pdf'): Promise<Buffer> {
    // Resolvemos a la carpeta templates en la raíz del microservicio
    const templatePath = path.resolve(process.cwd(), 'templates', templateName);

    return new Promise((resolve, reject) => {
      const options: { convertTo?: string } = {};
      
      // Extraemos la extensión de la plantilla original (ej. 'docx', 'xlsx')
      const ext = path.extname(templateName).replace('.', '').toLowerCase();

      // Si el formato solicitado es distinto al de la plantilla original, LibreOffice lo convierte
      if (format !== ext) {
        options.convertTo = format;
      }

      carbone.render(templatePath, data, options, (err, result) => {
        if (err) return reject(err);
        resolve(result as Buffer);
      });
    });
  }
}