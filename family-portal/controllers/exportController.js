const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const db = require("../config/db");

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
