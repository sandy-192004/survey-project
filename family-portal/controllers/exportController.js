const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const db = require("../config/db");

exports.excel = async (req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Families");

  ws.columns = [
    { header: "Name", key: "name" },
    { header: "Mobile", key: "mobile" },
    { header: "District", key: "district" }
  ];

  const [rows] = await db.promise().query(
    "SELECT name,mobile,district FROM family_members WHERE parent_id IS NULL"
  );

  ws.addRows(rows);

  res.setHeader("Content-Disposition", "attachment; filename=families.xlsx");
  await wb.xlsx.write(res);
  res.end();
};

exports.pdf = async (req, res) => {
  const doc = new PDFDocument();
  res.setHeader("Content-Disposition", "attachment; filename=families.pdf");
  doc.pipe(res);

  const [rows] = await db.promise().query(
    "SELECT name,mobile,district FROM family_members WHERE parent_id IS NULL"
  );

  rows.forEach(r => doc.text(`${r.name} | ${r.mobile} | ${r.district}`));
  doc.end();
};
