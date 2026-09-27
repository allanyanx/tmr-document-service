import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { CarboneAdapter } from '../carbone/carboneAdapter.js';
import fs from 'fs';
import path from 'path';

// Conexión a Redis. En producción, usar variables de entorno para seguridad.
const connection = new Redis('rediss://default:gQAAAAAABI2rAAIgcDJmZjhmNjczYTkwMzU0OTlhOWEwOGJjNGFlYTI4ZjkwYQ@measured-husky-298411.upstash.io:6379', {
    maxRetriesPerRequest: null,
});

// 1. EL EVENT BUS (Cola)
// Representa el canal donde los Productores (Fastify) envían los eventos.
export const documentQueue = new Queue('document-generation', { connection });

// 2. EL CONSUMIDOR (Worker)
// Escucha eventos de forma asíncrona. Si Dokploy o el CPU se saturan, los trabajos
// simplemente esperarán aquí sin tirar abajo el servidor (Resiliencia).
export const documentWorker = new Worker('document-generation', async job => {
    console.log(`[Worker] Procesando el reporte ID: ${job.id}`);
    const { templateName, data, format } = job.data;
    
    try {
        // Ejecutamos la lógica de generación. LibreOffice (para PDF) puede ser lento,
        // pero docx y xlsx serán muy rápidos.
        const adapter = new CarboneAdapter();
        const fileBuffer = await adapter.generateDocument(templateName, data, format);

        // Guardamos el Archivo temporalmente en disco con la extensión correcta.
        // ESTRATEGIA DE CONTROL (TTL / Caché): 
        // Idealmente, se debería configurar un CronJob o política en Dokploy/Linux
        // que elimine archivos en 'outputs/' de más de 24 horas (Time To Live).
        const fileName = `reporte-${job.id}.${format}`;
        const outputPath = path.join(process.cwd(), 'outputs', fileName);
        
        fs.writeFileSync(outputPath, fileBuffer);

        // Obtenemos la URL base desde las variables de entorno (para Dokploy) 
        // o usamos localhost para pruebas locales.
        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

        // Devolvemos el resultado al Bus de Eventos. El Endpoint de 'status' lo leerá.
        return { 
            success: true, 
            url: `${baseUrl}/api/reports/download/${fileName}` 
        };
    } catch (error) {
        console.error(`[Worker] Error generando documento ${job.id}:`, error);
        throw error; // Lanzar el error permite a BullMQ gestionar reintentos (Dead Letter Queue)
    }
}, {
    connection,
    // ESTRATEGIA DE RESILIENCIA Y RECURSOS:
    // Limitamos a LibreOffice a procesar máximo 2 documentos a la vez. 
    // Evitamos picos de uso del 100% de CPU en el servidor de Docker/Dokploy.
    concurrency: 2 
});

// Logs de monitoreo de eventos
documentWorker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} completado exitosamente.`);
});

documentWorker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} falló de forma crítica: ${err.message}`);
});