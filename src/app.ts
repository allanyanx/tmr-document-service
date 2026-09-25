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

const start = async () => {
    try {
        await server.listen({ port: 3000, host: '0.0.0.0' });
        console.log('🚀 Servidor corriendo en http://localhost:3000');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();