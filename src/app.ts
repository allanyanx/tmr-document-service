import Fastify from 'fastify';
import { z } from 'zod';
import { documentQueue } from './infrastructure/queue/documentQueue.js';

const server = Fastify({ logger: true });

// Esquema de validación para el body de la petición
const generateReportSchema = z.object({
  templateName: z.string().min(1, "El nombre de la plantilla es obligatorio"),
  data: z.any() // Aquí irán los datos dinámicos a inyectar en la plantilla
});

// Endpoint de Healthcheck (vital para Docker/Dokploy)
server.get('/health', async (request, reply) => {
    return { status: 'OK', service: 'Document Generator' };
});

// Endpoint para solicitar la generación de un documento
server.post('/api/reports/generate', async (request, reply) => {
    try {
        // 1. Validamos los datos de entrada
        const body = generateReportSchema.parse(request.body);

        // 2. Insertamos el trabajo en la cola de BullMQ
        const job = await documentQueue.add('generate-report', {
            templateName: body.templateName,
            data: body.data
        });

        // 3. Respondemos rápidamente con un 202 Accepted y el ID del trabajo
        return reply.code(202).send({
            message: 'Generación de reporte encolada con éxito',
            jobId: job.id,
            statusUrl: `/api/reports/status/${job.id}` // Ruta futura para consultar el estado
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ error: 'Datos inválidos', details: error.issues });
        }
        server.log.error(error);
        return reply.code(500).send({ error: 'Error interno del servidor' });
    }
});

// Endpoint para consultar el estado del trabajo
server.get('/api/reports/status/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };

    try {
        // Buscamos el trabajo en la cola de Redis
        const job = await documentQueue.getJob(jobId);

        if (!job) {
            return reply.code(404).send({ error: 'Trabajo no encontrado' });
        }

        // Determinamos el estado del trabajo
        const state = await job.getState();

        if (state === 'completed') {
            return reply.code(200).send({
                status: 'COMPLETED',
                // job.returnvalue contiene lo que el Worker retornó
                result: job.returnvalue 
            });
        } else if (state === 'failed') {
            return reply.code(200).send({
                status: 'FAILED',
                error: job.failedReason
            });
        } else {
            // states: 'waiting', 'active', 'delayed', etc.
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

// Endpoint temporal para descargar los PDFs generados localmente
server.get('/api/reports/download/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    
    try {
        const fs = await import('fs');
        const path = await import('path');

        const filePath = path.join(process.cwd(), 'outputs', filename);

        if (!fs.existsSync(filePath)) {
            return reply.code(404).send({ error: 'Archivo no encontrado' });
        }

        const stream = fs.createReadStream(filePath);
        reply.header('Content-Type', 'application/pdf');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        return reply.send(stream);
    } catch (error) {
        server.log.error(error);
        return reply.code(500).send({ error: 'Error al descargar archivo' });
    }
});

const start = async () => {
    try {
        await server.listen({ port: 3001, host: '0.0.0.0' });
        console.log('🚀 Servidor corriendo en http://localhost:3000');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();