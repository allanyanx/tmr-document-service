import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { pipeline } from 'stream';

const pump = util.promisify(pipeline);

export default async function templateRoutes(server: FastifyInstance) {
    const templatesDir = path.join(process.cwd(), 'templates');

    // Asegurarse de que el directorio exista
    if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
    }

    // -------------------------------------------------------------------------
    // 1. Obtener lista de plantillas disponibles
    // -------------------------------------------------------------------------
    server.get('/api/templates', async (request, reply) => {
        try {
            const files = fs.readdirSync(templatesDir);
            // Opcional: Filtrar solo archivos con extensiones permitidas
            const templates = files.filter(file => file.endsWith('.docx') || file.endsWith('.xlsx') || file.endsWith('.odt'));
            
            return reply.send({ templates });
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Error al obtener la lista de plantillas' });
        }
    });

    // -------------------------------------------------------------------------
    // 2. Subir una nueva plantilla
    // -------------------------------------------------------------------------
    server.post('/api/templates/upload', async (request, reply) => {
        try {
            const data = await request.file();
            
            if (!data) {
                return reply.code(400).send({ error: 'No se envió ningún archivo' });
            }

            const fileName = data.filename;
            const filePath = path.join(templatesDir, fileName);

            // Guardamos el archivo en el sistema de archivos
            await pump(data.file, fs.createWriteStream(filePath));

            return reply.code(201).send({ message: 'Plantilla subida con éxito', fileName });
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Error al subir la plantilla' });
        }
    });

    // -------------------------------------------------------------------------
    // 3. Eliminar una plantilla (opcional pero recomendado)
    // -------------------------------------------------------------------------
    server.delete('/api/templates/:filename', async (request, reply) => {
        const { filename } = request.params as { filename: string };
        try {
            const filePath = path.join(templatesDir, filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return reply.send({ message: 'Plantilla eliminada' });
            } else {
                return reply.code(404).send({ error: 'Plantilla no encontrada' });
            }
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Error al eliminar la plantilla' });
        }
    });
}
