import Fastify from 'fastify';
import { z } from 'zod';
import path from 'path';
import { documentQueue } from './infrastructure/queue/documentQueue.js';
import { CarboneAdapter } from './infrastructure/carbone/carboneAdapter.js';

type SupportedFormat = 'pdf' | 'docx' | 'xlsx';

const server = Fastify({ logger: true });
const carboneAdapter = new CarboneAdapter();

// Esquema de validación para el body de la petición
const generateReportSchema = z.object({
  templateName: z.string().min(1, "El nombre de la plantilla es obligatorio"),
  data: z.any(),
  format: z.enum(['pdf', 'docx', 'xlsx']).default('pdf')
});

// Endpoint de Healthcheck
server.get('/health', async (request, reply) => {
    return { status: 'OK', service: 'Document Generator' };
});

// 1. ENDPOINT DIRECTO (Sincrónico): Genera el documento y lo devuelve descargable
server.post('/api/reports/render', async (request, reply) => {
    try {
        const body = generateReportSchema.parse(request.body);
        
        // Genera el Buffer en memoria
        const buffer = await carboneAdapter.generateDocument(body.templateName, body.data, body.format as SupportedFormat);

        // Mapeo de MIME Types según formato
        let mimeType = 'application/pdf';
        if (body.format === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (body.format === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        const filename = `reporte_${Date.now()}.${body.format}`;

        // Respondemos enviando el buffer como archivo adjunto para descarga
        return reply
            .header('Content-Type', mimeType)
            .header('Content-Disposition', `attachment; filename="${filename}"`)
            .send(buffer);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ error: 'Datos inválidos', details: error.issues });
        }
        server.log.error(error);
        return reply.code(500).send({ error: 'Error interno al generar el documento' });
    }
});

// 2. ENDPOINT ASÍNCRONO (Cola): Encola el trabajo en BullMQ
server.post('/api/reports/generate', async (request, reply) => {
    try {
        const body = generateReportSchema.parse(request.body);

        const job = await documentQueue.add('generate-report', {
            templateName: body.templateName,
            data: body.data,
            format: body.format
        });

        return reply.code(202).send({
            message: 'Generación de reporte encolada con éxito',
            jobId: job.id,
            statusUrl: `/api/reports/status/${job.id}`
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
        await server.listen({ port: 3001, host: '0.0.0.0' });
        console.log('🚀 Servidor corriendo en http://localhost:3001');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();