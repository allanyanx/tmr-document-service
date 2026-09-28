import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, HeadingLevel } from "docx";
import * as fs from "fs";
import * as path from "path";

async function createDocxTemplate(filename, headers, tags) {
    const tableRows = [];

    // Header row
    tableRows.push(
        new TableRow({
            children: headers.map(header => 
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
                    width: { size: 100 / headers.length, type: WidthType.PERCENTAGE }
                })
            )
        })
    );

    // Data row with tags
    tableRows.push(
        new TableRow({
            children: tags.map(tag => 
                new TableCell({
                    children: [new Paragraph(tag)]
                })
            )
        })
    );

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "{d.titulo}",
                    heading: HeadingLevel.HEADING_1
                }),
                new Paragraph({
                    text: "Generado: {d.fechaGeneracion}"
                }),
                new Paragraph({ text: "" }), // Spacing
                new Table({
                    rows: tableRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                })
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(process.cwd(), 'templates', filename), buffer);
    console.log(`Creada plantilla: ${filename}`);
}

async function main() {
    // 1. Horas
    await createDocxTemplate('reporte_horas.docx', 
        ['Cliente', 'Estado Cliente', 'Mes', 'Año', 'Recursos', 'Horas'],
        ['{d.items[i].cliente}', '{d.items[i].estadoCliente}', '{d.items[i].mes}', '{d.items[i].anio}', '{d.items[i].recursos}', '{d.items[i].horas}']
    );

    // 2. Fechas
    await createDocxTemplate('reporte_fechas.docx',
        ['Código', 'Proyecto', 'Líder', 'Cliente', 'Estado', 'Tipo', 'Recurso', 'Cargo', 'Inicio', 'Fin', 'Presupuesto', 'Horas'],
        ['{d.items[i].codigoProyecto}', '{d.items[i].proyecto}', '{d.items[i].lider}', '{d.items[i].cliente}', '{d.items[i].estadoProyecto}', '{d.items[i].tipoProyecto}', '{d.items[i].recurso}', '{d.items[i].cargo}', '{d.items[i].fechaInicio}', '{d.items[i].fechaFin}', '{d.items[i].presupuesto}', '{d.items[i].horas}']
    );

    // 3. Clientes
    await createDocxTemplate('reporte_clientes.docx',
        ['Identificador', 'Nombre comercial', 'Nombres', 'Apellidos', 'Correo', 'Teléfono', 'Estado'],
        ['{d.items[i].identificador}', '{d.items[i].nombreComercial}', '{d.items[i].nombres}', '{d.items[i].apellidos}', '{d.items[i].correo}', '{d.items[i].telefono}', '{d.items[i].estado}']
    );

    // 4. Lideres
    await createDocxTemplate('reporte_lideres.docx',
        ['Nombre', 'Clientes vinculados', 'Correo', 'Teléfono', 'Tipo', 'Estado'],
        ['{d.items[i].nombre}', '{d.items[i].clientes}', '{d.items[i].correo}', '{d.items[i].telefono}', '{d.items[i].tipo}', '{d.items[i].estado}']
    );

    // 5. Proyectos
    await createDocxTemplate('reporte_proyectos.docx',
        ['Código', 'Nombre', 'Cliente', 'Tipo', 'Seguimiento', 'Estado', 'Inicio', 'Fin', 'Horas'],
        ['{d.items[i].codigo}', '{d.items[i].nombre}', '{d.items[i].cliente}', '{d.items[i].tipo}', '{d.items[i].seguimiento}', '{d.items[i].estado}', '{d.items[i].inicio}', '{d.items[i].fin}', '{d.items[i].horas}']
    );
}

main().catch(console.error);
