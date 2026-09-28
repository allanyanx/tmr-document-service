import ExcelJS from 'exceljs';
import path from 'path';

async function createTemplates() {
    const templatesDir = path.join(process.cwd(), 'templates');

    // 1. Plantilla Reporte Horas
    const workbookHoras = new ExcelJS.Workbook();
    const sheetHoras = workbookHoras.addWorksheet('Reporte de Horas');
    sheetHoras.getCell('A1').value = '{d.titulo}';
    sheetHoras.getCell('A1').font = { size: 16, bold: true };
    sheetHoras.getCell('A2').value = 'Generado: {d.fechaGeneracion}';
    sheetHoras.getRow(4).values = ['Cliente', 'Estado Cliente', 'Mes', 'Año', 'Recursos', 'Horas'];
    sheetHoras.getRow(4).font = { bold: true };
    sheetHoras.getRow(5).values = ['{d.items[i].cliente}', '{d.items[i].estadoCliente}', '{d.items[i].mes}', '{d.items[i].anio}', '{d.items[i].recursos}', '{d.items[i].horas}'];
    sheetHoras.columns = [{ width: 30 }, { width: 18 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];
    await workbookHoras.xlsx.writeFile(path.join(templatesDir, 'reporte_horas.xlsx'));

    // 2. Plantilla Reporte Fechas
    const workbookFechas = new ExcelJS.Workbook();
    const sheetFechas = workbookFechas.addWorksheet('Reporte de Fechas');
    sheetFechas.getCell('A1').value = '{d.titulo}';
    sheetFechas.getCell('A1').font = { size: 16, bold: true };
    sheetFechas.getCell('A2').value = 'Generado: {d.fechaGeneracion}';
    sheetFechas.getRow(4).values = ['Código del Proyecto', 'Proyecto', 'Líder', 'Cliente', 'Estado del Proyecto', 'Tipo de Proyecto', 'Recurso', 'Cargo', 'Fecha de Inicio', 'Fecha de Fin Estimada', 'Fecha Fin Real', 'Presupuesto', 'Horas', 'Fecha Inicio Espera', 'Fecha Fin Espera', 'Observaciones'];
    sheetFechas.getRow(4).font = { bold: true };
    sheetFechas.getRow(5).values = ['{d.items[i].codigoProyecto}', '{d.items[i].proyecto}', '{d.items[i].lider}', '{d.items[i].cliente}', '{d.items[i].estadoProyecto}', '{d.items[i].tipoProyecto}', '{d.items[i].recurso}', '{d.items[i].cargo}', '{d.items[i].fechaInicio}', '{d.items[i].fechaFin}', '{d.items[i].fechaFinReal}', '{d.items[i].presupuesto}', '{d.items[i].horas}', '{d.items[i].fechaInicioEspera}', '{d.items[i].fechaFinEspera}', '{d.items[i].observaciones}'];
    await workbookFechas.xlsx.writeFile(path.join(templatesDir, 'reporte_fechas.xlsx'));

    // 3. Plantilla Reporte Clientes
    const workbookClientes = new ExcelJS.Workbook();
    const sheetClientes = workbookClientes.addWorksheet('Reporte de Clientes');
    sheetClientes.getCell('A1').value = '{d.titulo}';
    sheetClientes.getCell('A1').font = { size: 16, bold: true };
    sheetClientes.getCell('A2').value = 'Generado: {d.fechaGeneracion}';
    sheetClientes.getRow(4).values = ['Tipo ID', 'Identificador', 'Nombre comercial', 'Nombres', 'Apellidos', 'Correo electrónico', 'Teléfono', 'Dirección', 'Estado', 'Proyectos asignados'];
    sheetClientes.getRow(4).font = { bold: true };
    sheetClientes.getRow(5).values = ['{d.items[i].tipoId}', '{d.items[i].identificador}', '{d.items[i].nombreComercial}', '{d.items[i].nombres}', '{d.items[i].apellidos}', '{d.items[i].correo}', '{d.items[i].telefono}', '{d.items[i].direccion}', '{d.items[i].estado}', '{d.items[i].proyectos}'];
    await workbookClientes.xlsx.writeFile(path.join(templatesDir, 'reporte_clientes.xlsx'));

    // 4. Plantilla Reporte Lideres
    const workbookLideres = new ExcelJS.Workbook();
    const sheetLideres = workbookLideres.addWorksheet('Reporte de Lideres');
    sheetLideres.getCell('A1').value = '{d.titulo}';
    sheetLideres.getCell('A1').font = { size: 16, bold: true };
    sheetLideres.getCell('A2').value = 'Generado: {d.fechaGeneracion}';
    sheetLideres.getRow(4).values = ['Nombre', 'Clientes vinculados', 'Correo', 'Teléfono', 'Tipo', 'Estado'];
    sheetLideres.getRow(4).font = { bold: true };
    sheetLideres.getRow(5).values = ['{d.items[i].nombre}', '{d.items[i].clientes}', '{d.items[i].correo}', '{d.items[i].telefono}', '{d.items[i].tipo}', '{d.items[i].estado}'];
    await workbookLideres.xlsx.writeFile(path.join(templatesDir, 'reporte_lideres.xlsx'));

    // 5. Plantilla Reporte Proyectos
    const workbookProyectos = new ExcelJS.Workbook();
    const sheetProyectos = workbookProyectos.addWorksheet('Reporte de Proyectos');
    sheetProyectos.getCell('A1').value = '{d.titulo}';
    sheetProyectos.getCell('A1').font = { size: 16, bold: true };
    sheetProyectos.getCell('A2').value = 'Generado: {d.fechaGeneracion}';
    sheetProyectos.getRow(4).values = ['Código', 'Nombre', 'Cliente', 'Tipo', 'Seguimiento', 'Estado', 'Inicio', 'Fin', 'Fecha Fin Real', 'Horas', 'Presupuesto', 'Líder', 'Costo/h Líder', 'Recurso', 'Rol', 'Inicio Espera', 'Fin Espera'];
    sheetProyectos.getRow(4).font = { bold: true };
    sheetProyectos.getRow(5).values = ['{d.items[i].codigo}', '{d.items[i].nombre}', '{d.items[i].cliente}', '{d.items[i].tipo}', '{d.items[i].seguimiento}', '{d.items[i].estado}', '{d.items[i].inicio}', '{d.items[i].fin}', '{d.items[i].fechaFinReal}', '{d.items[i].horas}', '{d.items[i].presupuesto}', '{d.items[i].lider}', '{d.items[i].costoLider}', '{d.items[i].recurso}', '{d.items[i].rol}', '{d.items[i].inicioEspera}', '{d.items[i].finEspera}'];
    await workbookProyectos.xlsx.writeFile(path.join(templatesDir, 'reporte_proyectos.xlsx'));

    console.log('Todas las plantillas generadas correctamente.');
}

createTemplates().catch(console.error);
