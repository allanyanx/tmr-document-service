import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { CarboneAdapter } from '../carbone/carboneAdapter.js';

// Conexión a Redis
const connection = new Redis('rediss://default:gQAAAAAABI2rAAIgcDJmZjhmNjczYTkwMzU0OTlhOWEwOGJjNGFlYTI4ZjkwYQ@measured-husky-298411.upstash.io:6379', {
    maxRetriesPerRequest: null,
});

// Definimos la cola
export const documentQueue = new Queue('document-generation', { connection });

// Definimos el Worker (el que hace el trabajo pesado)
export const documentWorker = new Worker('document-generation', async job => {
    console.log(`Procesando el reporte ID: ${job.id}`);
    const { templateName, data } = job.data;
    
    try {
        // 1. Llamamos a Carbone para generar el PDF (esto toma unos segundos)
        const adapter = new CarboneAdapter();
        const pdfBuffer = await adapter.generateDocument(templateName, data);

        // 2. Guardamos el PDF en disco temporalmente (o AWS S3 en el futuro)
        const fs = await import('fs');
        const path = await import('path');

        const fileName = `reporte-${job.id}.pdf`;
        const outputPath = path.join(process.cwd(), 'outputs', fileName);
        
        fs.writeFileSync(outputPath, pdfBuffer);

        // 3. Devolvemos la URL final de descarga
        return { 
            success: true, 
            url: `http://localhost:3001/api/reports/download/${fileName}` 
        };
    } catch (error) {
        console.error('Error generando documento:', error);
        throw error; // Al lanzar el error, BullMQ marca el Job como FAILED
    }
}, {
    connection,
    concurrency: 2 // Limita LibreOffice a 2 trabajos simultáneos para no explotar la RAM
});

documentWorker.on('completed', job => {
    console.log(`Job ${job.id} completado con éxito`);
});