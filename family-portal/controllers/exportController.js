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
    const doc = new PDFDocument({ margin: 30 });
    res.setHeader("Content-Disposition", "attachment; filename=families.pdf");
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    const [rows] = await db.query(
      "SELECT name, mobile, district FROM family_members WHERE member_type = 'parent'"
    );

    doc.fontSize(16).text("Family Members List", { align: "center" });
    doc.moveDown();

    if (rows && rows.length > 0) {
      rows.forEach(r => {
        doc
          .fontSize(12)
          .text(`Name: ${r.name} | Mobile: ${r.mobile} | District: ${r.district}`)
          .moveDown(0.5);
      });
    } else {
      doc.fontSize(12).text("No family data available.");
    }

    doc.end();
  } catch (err) {
    console.error("🔥 PDF export error:", err);
    res.status(500).send("Failed to export PDF file");
  }
};

exports.exportToExcel = async (req, res) => {
  try {
    // Get all rows from family_members table
    const [data] = await db.query('SELECT * FROM family_members ORDER BY family_id, member_type');
    console.log('Excel export: Fetched', data.length, 'rows from family_members');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Family Data');

    // Add headers for all columns
    worksheet.columns = [
  { header: 'ID', key: 'id', width: 8 },
  { header: 'Family ID', key: 'family_id', width: 10 },
  { header: 'Member Type', key: 'member_type', width: 12 },
  { header: 'Name', key: 'name', width: 20 },
  { header: 'Relationship', key: 'relationship', width: 15 },
  { header: 'Mobile', key: 'mobile', width: 15 },
  { header: 'Occupation', key: 'occupation', width: 20 },
  { header: 'Date of Birth', key: 'dob', width: 15 },
  { header: 'Gender', key: 'gender', width: 10 },
  { header: 'Door No', key: 'door_no', width: 10 },
  { header: 'Street', key: 'street', width: 20 },
  { header: 'District', key: 'district', width: 15 },
  { header: 'State', key: 'state', width: 15 },
  { header: 'Pincode', key: 'pincode', width: 10 },
  { header: 'Photo', key: 'photo', width: 30 },
  { header: 'Created At', key: 'created_at', width: 20 }
];

    // Add each row from the database
    for (const row of data) {
      worksheet.addRow(row);
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

    let query = 'SELECT * FROM family_members ORDER BY family_id, member_type';
    let params = [];

    if (state && district) {
      query = 'SELECT * FROM family_members WHERE state = ? AND district = ? ORDER BY family_id, member_type';
      params = [state, district];
      console.log('Filtering by state and district:', state, district);
    } else {
      console.log('No filters applied, exporting all data');
    }

    const [data] = await db.query(query, params);
    console.log('PDF export: Fetched', data.length, 'rows from family_members');

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=family-data.pdf');

    doc.pipe(res);

    // Title
    const title = state && district ? `Family Details – ${state} / ${district}` : 'Family Members Data Export';
    doc.fontSize(14).text(title, { align: 'center' });
    doc.moveDown(2);

    if (data.length === 0) {
      doc.fontSize(12).text('No data available for the selected filters.');
      doc.end();
      return;
    }

    // Use monospaced font for table-like appearance
    doc.font('Courier');

    // Header row
    const header = 'Family ID | Member Type | Name                | Relationship | Mobile       | Occupation         | DOB        | Gender | Address                          | Pincode';
    doc.fontSize(8).text(header);
    doc.moveDown(0.5);

    // Separator line
    doc.text('----------|-------------|---------------------|--------------|---------------|---------------------|------------|--------|----------------------------------|---------');
    doc.moveDown(0.5);

    // Data rows
    data.forEach((member) => {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage();
        // Repeat header on new page
        doc.fontSize(8).text(header);
        doc.moveDown(0.5);
        doc.text('----------|-------------|---------------------|--------------|---------------|---------------------|------------|--------|----------------------------------|---------');
        doc.moveDown(0.5);
      }

      const familyId = (member.family_id || '').toString().padEnd(9);
      const memberType = (member.member_type || '').toString().padEnd(12);
      const name = (member.name || '').toString().padEnd(20).substring(0, 20);
      const relationship = (member.relationship || '').toString().padEnd(13);
      const mobile = (member.mobile || '').toString().padEnd(14);
      const occupation = (member.occupation || '').toString().padEnd(20).substring(0, 20);
      const dob = member.dob ? new Date(member.dob).toLocaleDateString().padEnd(11) : ''.padEnd(11);
      const gender = (member.gender || '').toString().padEnd(7);
      const address = [member.door_no, member.street, member.district, member.state].filter(Boolean).join(', ').padEnd(33).substring(0, 33);
      const pincode = (member.pincode || '').toString().padEnd(8);

      const row = `${familyId}|${memberType}|${name}|${relationship}|${mobile}|${occupation}|${dob}|${gender}|${address}|${pincode}`;
      doc.text(row);
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).send('Error exporting data');
  }
};
