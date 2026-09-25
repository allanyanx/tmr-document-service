import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

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

    // Aquí llamaremos a Carbone para generar el PDF
    // await carboneAdapter.generate(templateName, data);

    return { success: true, url: 'http://link-al-pdf.com/file.pdf' };
}, {
    connection,
    concurrency: 2 // Limita LibreOffice a 2 trabajos simultáneos para no explotar la RAM
});

documentWorker.on('completed', job => {
    console.log(`Job ${job.id} completado con éxito`);
});