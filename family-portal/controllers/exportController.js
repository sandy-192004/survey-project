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
    // Get all rows from family_members table
    const [data] = await db.query('SELECT * FROM family_members ORDER BY family_id, member_type');
    console.log('PDF export: Fetched', data.length, 'rows from family_members');

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=family-data.pdf');

    doc.pipe(res);

    doc.fontSize(18).text('Family Members Data Export', { align: 'center' });
    doc.moveDown();

    let currentFamilyId = null;

    data.forEach((member) => {
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      if (member.family_id !== currentFamilyId) {
        if (currentFamilyId !== null) {
          doc.moveDown();
        }
        doc.fontSize(12).text(`Family ID: ${member.family_id}`, { underline: true });
        currentFamilyId = member.family_id;
        doc.moveDown(0.3);
      }

      doc.fontSize(10).text(`Member ID: ${member.id}, Family ID: ${member.family_id}, Type: ${member.member_type}, Name: ${member.name}, Relationship: ${member.relationship}`);
      doc.text(`Mobile: ${member.mobile || 'N/A'}, Occupation: ${member.occupation || 'N/A'}, DOB: ${member.dob ? new Date(member.dob).toLocaleDateString() : 'N/A'}, Gender: ${member.gender || 'N/A'}`);
      doc.text(`Address: ${member.door_no || 'N/A'}, ${member.street || 'N/A'}, ${member.district || 'N/A'}, ${member.state || 'N/A'}, ${member.pincode || 'N/A'}`);
      doc.text(`Photo: ${member.photo || 'N/A'}, Created: ${member.created_at ? new Date(member.created_at).toLocaleString() : 'N/A'}`);
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).send('Error exporting data');
  }
};

