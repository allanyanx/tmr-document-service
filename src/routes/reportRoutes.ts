import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { documentQueue } from '../infrastructure/queue/documentQueue.js';
import fs from 'fs';
import path from 'path';

// Esquema de validación para asegurar la integridad de los datos entrantes (DDD - Validaciones de Dominio)
const generateReportSchema = z.object({
  templateName: z.string().min(1, "El nombre de la plantilla es obligatorio"),
  data: z.any(), // Datos dinámicos para inyectar en la plantilla
  format: z.enum(['pdf', 'docx', 'xlsx']).default('pdf') // Formato de salida
});

export default async function reportRoutes(server: FastifyInstance) {
    
    // -------------------------------------------------------------------------
    // 1. EDD (Productor) - Endpoint Asíncrono para encolar la tarea (Write Model)
    // -------------------------------------------------------------------------
    server.post('/api/reports/generate', async (request, reply) => {
        try {
            // Validamos contrato de datos
            const body = generateReportSchema.parse(request.body);

            // Publicamos el Evento (Job) en el Event Bus (Cola BullMQ / Redis)
            const job = await documentQueue.add('generate-report', {
                templateName: body.templateName,
                data: body.data,
                format: body.format
            });

            // Respondemos de inmediato al Frontend para evitar Timeouts.
            // HTTP 202 Accepted: La petición ha sido aceptada para procesamiento.
            return reply.code(202).send({
                message: 'Generación de reporte encolada con éxito',
                jobId: job.id,
                statusUrl: `/api/reports/status/${job.id}` // Ruta para el Polling
            });

        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Datos inválidos', details: error.issues });
            }
            server.log.error(error);
            return reply.code(500).send({ error: 'Error interno del servidor' });
        }
    });

    // -------------------------------------------------------------------------
    // 2. CQRS (Read Model) - Endpoint para consultar el estado de la tarea
    // -------------------------------------------------------------------------
    server.get('/api/reports/status/:jobId', async (request, reply) => {
        const { jobId } = request.params as { jobId: string };

        try {
            // Buscamos el estado actual del evento en Redis
            const job = await documentQueue.getJob(jobId);

            if (!job) {
                return reply.code(404).send({ error: 'Trabajo no encontrado en la cola' });
            }

            const state = await job.getState();

            // Si ya terminó, devolvemos la URL para que el usuario descargue
            if (state === 'completed') {
                return reply.code(200).send({
                    status: 'COMPLETED',
                    result: job.returnvalue // Contiene { url: '...' } generado por el Worker
                });
            } else if (state === 'failed') {
                return reply.code(200).send({
                    status: 'FAILED',
                    error: job.failedReason
                });
            } else {
                // Estados: 'waiting', 'active', 'delayed'
                return reply.code(200).send({
                    status: state.toUpperCase(),
                    message: 'El documento se está procesando...'
                });
            }
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Error al consultar el estado' });
        }
    });

    // -------------------------------------------------------------------------
    // 3. Endpoint de Descarga (Entrega de Datos Binarios Multiformato)
    // -------------------------------------------------------------------------
    server.get('/api/reports/download/:filename', async (request, reply) => {
        const { filename } = request.params as { filename: string };
        
        try {
            const filePath = path.join(process.cwd(), 'outputs', filename);

            if (!fs.existsSync(filePath)) {
                return reply.code(404).send({ error: 'El archivo ya no existe o caducó su TTL.' });
            }

            const stream = fs.createReadStream(filePath);
            
            // Asignamos el MIME type dinámicamente según el formato
            if (filename.endsWith('.pdf')) {
                reply.header('Content-Type', 'application/pdf');
            } else if (filename.endsWith('.docx')) {
                reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            } else if (filename.endsWith('.xlsx')) {
                reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            }

            reply.header('Content-Disposition', `attachment; filename="${filename}"`);
            
            return reply.send(stream);
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Error interno al intentar descargar el archivo' });
        }
    });
}
