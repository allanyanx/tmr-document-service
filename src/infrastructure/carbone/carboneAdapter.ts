import carbone from 'carbone';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CarboneAdapter {
  generateDocument(templateName: string, data: any): Promise<Buffer> {
    const templatePath = path.resolve(__dirname, '../../../../templates', templateName);

        return new Promise((resolve, reject) => {
          // Opciones: convertTo indica que queremos exportar a PDF (requiere LibreOffice)
          const options = { convertTo: 'pdf' };

          carbone.render(templatePath, data, options, (err, result) => {
            if (err) return reject(err);
            resolve(result as Buffer); // El buffer contiene el PDF generado
          });
        });
      }
    }