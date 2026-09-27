import carbone from 'carbone';
import path from 'path';

export class CarboneAdapter {
    /**
     * Genera un documento usando Carbone y opcionalmente LibreOffice.
     * Patrón de Diseño: Adapter (GoF) - Oculta la complejidad de la librería externa Carbone.
     * 
     * @param templateName Nombre del archivo en la carpeta 'templates'
     * @param data Objeto JSON con los datos del dominio a inyectar
     * @param format Formato de salida ('pdf', 'docx', 'xlsx')
     * @returns Promise<Buffer> Binario puro del documento resultante
     */
    generateDocument(templateName: string, data: any, format: string): Promise<Buffer> {
        const templatePath = path.join(process.cwd(), 'templates', templateName);

        return new Promise((resolve, reject) => {
            // Estrategia: Convertir a PDF fuerza el uso de LibreOffice.
            // Para Word/Excel directo, dejamos las opciones vacías para que devuelva
            // el formato original de la plantilla.
            const options: any = {};
            if (format === 'pdf') {
                options.convertTo = 'pdf';
            }

            carbone.render(templatePath, data, options, (err, result) => {
                if (err) return reject(err);
                
                // Retornamos el buffer binario. 
                // Esto previene que se corrompa la estructura ZIP interna de formatos Office.
                resolve(result as Buffer); 
            });
        });
    }
}