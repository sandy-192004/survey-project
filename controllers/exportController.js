const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../config/db');
const Admin = require('../models/admin');
const Child = require('../models/Child');


// ===================== EXPORT TO EXCEL =====================
exports.excel = async (req, res, next) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Families");

    ws.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Mobile", key: "mobile", width: 20 },
      { header: "District", key: "district", width: 25 }
    ];

    const [rows] = await db.query(
      "SELECT name, mobile, district FROM family_members WHERE member_type = 'parent'"
    );

    if (rows && rows.length > 0) {
      ws.addRows(rows);
    } else {
      ws.addRow(["No data available"]);
    }

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=families.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("🔥 Excel export error:", err);
    res.status(500).send("Failed to export Excel file");
  }
};

// ===================== EXPORT TO PDF =====================
exports.pdf = async (req, res, next) => {
  try {
    const { state, district } = req.query;
    console.log('PDF export params received:', { state, district });


  } catch (err) {
    console.error("🔥 PDF export error:", err);
    res.status(500).send("Failed to export PDF file");
  }
};

exports.exportToExcel = async (req, res) => {
  try {
    const [data] = await db.query(
      `SELECT
         p.user_id AS family_id,
         p.name,
         p.mobile,
         p.occupation,
         p.door_no,
         p.street,
         p.district,
         p.state,
         p.pincode,
         p.created_at,
         (
           SELECT COUNT(*)
           FROM relationships r
           WHERE r.user_id = p.user_id AND r.person_id = p.id AND r.relation = 'child'
         ) AS children_count
       FROM persons p
       WHERE p.id = (
         SELECT MIN(p2.id)
         FROM persons p2
         WHERE p2.user_id = p.user_id
       )
       ORDER BY p.user_id DESC`
    );
    console.log('Excel export: Fetched', data.length, 'rows from persons');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Family Data');

    worksheet.columns = [
      { header: 'Family ID', key: 'family_id', width: 12 },
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Mobile', key: 'mobile', width: 16 },
      { header: 'Occupation', key: 'occupation', width: 24 },
      { header: 'Door No', key: 'door_no', width: 12 },
      { header: 'Street', key: 'street', width: 24 },
      { header: 'District', key: 'district', width: 18 },
      { header: 'State', key: 'state', width: 18 },
      { header: 'Pincode', key: 'pincode', width: 12 },
      { header: 'Children Count', key: 'children_count', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 }
    ];

    if (data.length === 0) {
      worksheet.addRow({ name: 'No data available' });
    } else {
      data.forEach((row) => {
        worksheet.addRow({
          family_id: row.family_id,
          name: row.name || '',
          mobile: row.mobile || '',
          occupation: row.occupation || '',
          door_no: row.door_no || '',
          street: row.street || '',
          district: row.district || '',
          state: row.state || '',
          pincode: row.pincode || '',
          children_count: row.children_count || 0,
          created_at: row.created_at ? new Date(row.created_at).toLocaleDateString() : ''
        });
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=family-data.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).send('Error exporting data');
  }
};

exports.exportToPdf = async (req, res) => {
  try {
    const { state, district } = req.query;
    console.log('PDF export params received:', { state, district });

    let query = `
      SELECT
        p.user_id AS family_id,
        p.name,
        p.mobile,
        p.occupation,
        CONCAT_WS(', ', p.door_no, p.street, p.district, p.state, p.pincode) AS address,
        p.district,
        p.state,
        (
          SELECT COUNT(*)
          FROM relationships r
          WHERE r.user_id = p.user_id AND r.person_id = p.id AND r.relation = 'child'
        ) AS children_count
      FROM persons p
      WHERE p.id = (
        SELECT MIN(p2.id)
        FROM persons p2
        WHERE p2.user_id = p.user_id
      )
    `;
    const params = [];

    if (state && state.toLowerCase() !== 'all') {
      query += ' AND p.state = ?';
      params.push(state);
    }
    if (district && district.toLowerCase() !== 'all') {
      query += ' AND p.district = ?';
      params.push(district);
    }

    query += ' ORDER BY p.user_id DESC';

    const [data] = await db.query(query, params);
    console.log('PDF export: Fetched', data.length, 'rows from persons');

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=family-data.pdf');
    doc.pipe(res);

    let title = 'Family Details';
    if (state && state.toLowerCase() !== 'all' && district && district.toLowerCase() !== 'all') {
      title = `Family Details - ${state} / ${district}`;
    } else if (state && state.toLowerCase() !== 'all') {
      title = `Family Details - ${state}`;
    } else if (district && district.toLowerCase() !== 'all') {
      title = `Family Details - ${district}`;
    }

    doc.font('Helvetica-Bold').fontSize(14).text(title, { align: 'center' });
    doc.moveDown(1);

    if (data.length === 0) {
      doc.font('Helvetica').fontSize(12).text('No data available for the selected filters.');
      doc.end();
      return;
    }

    const columns = [
      { header: 'Family ID', width: 60 },
      { header: 'Name', width: 120 },
      { header: 'Mobile', width: 95 },
      { header: 'Occupation', width: 110 },
      { header: 'Address', width: 230 },
      { header: 'Children', width: 60 },
      { header: 'State', width: 80 }
    ];

    const startX = 20;
    let y = 85;
    const rowHeight = 22;
    const fontSize = 8;
    const pageBottom = 560;

    const drawTableHeader = (currentY) => {
      let x = startX;
      columns.forEach((col) => {
        doc.lineWidth(1).rect(x, currentY, col.width, rowHeight).stroke();
        doc.font('Helvetica-Bold').fontSize(fontSize).text(col.header, x + 3, currentY + 6, {
          width: col.width - 6,
          height: rowHeight - 8,
          lineBreak: false
        });
        x += col.width;
      });
      return currentY + rowHeight;
    };

    const drawRow = (row, currentY) => {
      const rowData = [
        row.family_id ? String(row.family_id) : '',
        row.name || '',
        row.mobile || '',
        row.occupation || '',
        row.address || '',
        String(row.children_count || 0),
        row.state || ''
      ];

      let x = startX;
      rowData.forEach((cell, idx) => {
        doc.lineWidth(1).rect(x, currentY, columns[idx].width, rowHeight).stroke();
        doc.font('Helvetica').fontSize(fontSize).text(cell, x + 3, currentY + 6, {
          width: columns[idx].width - 6,
          height: rowHeight - 8,
          lineBreak: false
        });
        x += columns[idx].width;
      });

      return currentY + rowHeight;
    };

    y = drawTableHeader(y);
    data.forEach((row) => {
      if (y + rowHeight > pageBottom) {
        doc.addPage();
        y = 60;
        y = drawTableHeader(y);
      }
      y = drawRow(row, y);
    });

    doc.end();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).send('Error exporting data');
  }
};
