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

    let query = 'SELECT * FROM family_members WHERE 1=1';
    let params = [];
    let conditions = [];
    if (state && state.toLowerCase() !== 'all') {
      query += ' AND state = ?';
      params.push(state);
      conditions.push('state');
    }
    if (district && district.toLowerCase() !== 'all') {
      query += ' AND district = ?';
      params.push(district);
      conditions.push('district');
    }
    query += ' ORDER BY family_id, member_type';
    console.log('PDF export: Filters applied, query:', query, 'params:', params);

    const [data] = await db.query(query, params);
    console.log('PDF export: Fetched', data.length, 'rows from family_members');

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=family-data.pdf');

    doc.pipe(res);

    // Title
    let title = 'Family Members Data Export';
    if (state && state.toLowerCase() !== 'all' && district && district.toLowerCase() !== 'all') {
      title = `Family Details – ${state} / ${district}`;
    } else if (state && state.toLowerCase() !== 'all') {
      title = `Family Details – ${state}`;
    } else if (district && district.toLowerCase() !== 'all') {
      title = `Family Details – ${district}`;

    } else if (state && state.toLowerCase() === 'all' && district && district.toLowerCase() === 'all') {
      title = `Family Details – All / All`;

    }
    doc.font('Helvetica-Bold').fontSize(16).text(title, { align: 'center' });
    doc.moveDown(2);

    if (data.length === 0) {
      const message = conditions.length > 0 ? 'No data available for the selected filters.' : 'No data available.';
      doc.fontSize(12).text(message);
      doc.end();
      return;
    }

    // Define table columns with maximized widths to fit A4 landscape (usable width ~802 points)
    const columns = [
      { header: 'ID', width: 50 },
      { header: 'Family ID', width: 50 },
      { header: 'Member Type', width: 50 },
      { header: 'Name', width: 50 },
      { header: 'Relationship', width: 50 },
      { header: 'Mobile', width: 50 },
      { header: 'Occupation', width: 50 },
      { header: 'DOB', width: 50 },
      { header: 'Gender', width: 50 },
      { header: 'Door No', width: 50 },
      { header: 'Street', width: 50 },
      { header: 'District', width: 50 },
      { header: 'State', width: 50 },
      { header: 'Pincode', width: 50 },
      { header: 'Photo', width: 50 },
      { header: 'Created At', width: 50 }
    ];

    const startX = 20;
    let y = 100;
    const rowHeight = 25;
    const fontSize = 8; // Reduced font size for table
    const pageBottom = 550;

    // Function to draw table header
    const drawTableHeader = (doc, y) => {
      let x = startX;
      columns.forEach((col, index) => {
        // Draw cell border
        doc.lineWidth(1).rect(x, y, col.width, rowHeight).stroke();
        // Draw header text
        doc.font('Helvetica-Bold').fontSize(fontSize);
        doc.text(col.header, x + 2, y + 2, { width: col.width - 4, height: rowHeight - 4, lineBreak: false });
        x += col.width;
      });
      return y + rowHeight;
    };

    // Function to draw a row
    const drawRow = (doc, rowData, y) => {
      let x = startX;
      rowData.forEach((cell, index) => {
        // Draw cell border
        doc.lineWidth(1).rect(x, y, columns[index].width, rowHeight).stroke();
        // Draw cell text
        doc.font('Helvetica').fontSize(fontSize);
        doc.text(cell, x + 2, y + 2, { width: columns[index].width - 4, height: rowHeight - 4, lineBreak: false });
        x += columns[index].width;
      });
      return y + rowHeight;
    };

    // Draw initial header
    y = drawTableHeader(doc, y);

    // Draw data rows
    data.forEach((member) => {
      // Check if next row exceeds page bottom
      if (y + rowHeight > pageBottom) {
        doc.addPage();
        y = 100;
        y = drawTableHeader(doc, y);
      }

      const rowData = [
        member.id ? member.id.toString() : '',
        member.family_id ? member.family_id.toString() : '',
        member.member_type || '',
        member.name || '',
        member.relationship || '',
        member.mobile || '',
        member.occupation || '',
        member.dob ? new Date(member.dob).toLocaleDateString() : '',
        member.gender || '',
        member.door_no || '',
        member.street || '',
        member.district || '',
        member.state || '',
        member.pincode ? member.pincode.toString() : '',
        member.photo || '',
        member.created_at ? new Date(member.created_at).toLocaleDateString() : ''
      ];
      y = drawRow(doc, rowData, y);
    });

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


    if (state && state.toLowerCase() !== 'all' && district && district.toLowerCase() !== 'all') {
      // New format for filtered exports
      let query = 'SELECT * FROM family_members WHERE member_type = \'parent\'';
      let params = [];
      if (state && state.toLowerCase() !== 'all') {
        query += ' AND state = ?';
        params.push(state);
      }
      if (district && district.toLowerCase() !== 'all') {
        query += ' AND district = ?';
        params.push(district);
      }
      query += ' ORDER BY family_id, relationship';
      console.log('PDF export: Filters applied, query:', query, 'params:', params);

      const [data] = await db.query(query, params);
      console.log('PDF export: Fetched', data.length, 'rows from family_members');

      // Process data to group by family_id
      const families = {};
      data.forEach(member => {
        if (!families[member.family_id]) {
          families[member.family_id] = {
            family_id: member.family_id,
            address: `${member.door_no || ''} ${member.street || ''} ${member.district || ''} ${member.state || ''} ${member.pincode || ''}`.trim()
          };
        }
        if (member.relationship && member.relationship.toLowerCase() === 'husband') {
          families[member.family_id].husband_name = member.name;
          families[member.family_id].husband_occupation = member.occupation;
          families[member.family_id].husband_mobile = member.mobile;
        } else if (member.relationship && member.relationship.toLowerCase() === 'wife') {
          families[member.family_id].wife_name = member.name;
          families[member.family_id].wife_occupation = member.occupation;
          families[member.family_id].wife_mobile = member.mobile;
        }

    let query = 'SELECT * FROM family_members WHERE 1=1';
    let params = [];
    let conditions = [];
    if (state && state.toLowerCase() !== 'all') {
      query += ' AND state = ?';
      params.push(state);
      conditions.push('state');
    }
    if (district && district.toLowerCase() !== 'all') {
      query += ' AND district = ?';
      params.push(district);
      conditions.push('district');
    }
    query += ' ORDER BY family_id, member_type';
    console.log('PDF export: Filters applied, query:', query, 'params:', params);

    const [data] = await db.query(query, params);
    console.log('PDF export: Fetched', data.length, 'rows from family_members');

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=family-data.pdf');

    doc.pipe(res);

    // Title
    let title = 'Family Members Data Export';
    if (state && state !== 'All' && district && district !== 'All') {
      title = `Family Details – ${state} / ${district}`;
    } else if (state && state !== 'All') {
      title = `Family Details – ${state}`;
    } else if (district && district !== 'All') {
      title = `Family Details – ${district}`;
    } else if (state === 'All' && district === 'All') {
      title = `Family Details – All / All`;
    }
    doc.font('Helvetica-Bold').fontSize(16).text(title, { align: 'center' });
    doc.moveDown(2);

    if (data.length === 0) {
      const message = conditions.length > 0 ? 'No data available for the selected filters.' : 'No data available.';
      doc.fontSize(12).text(message);
      doc.end();
      return;
    }

    // Define table columns with explicit widths to fit A4 landscape (usable width ~802 points)
    const columns = [
  { header: 'ID', width: 35 },
  { header: 'Family ID', width: 45 },
  { header: 'Member Type', width: 60 },
  { header: 'Name', width: 95 },
  { header: 'Relationship', width: 70 },
  { header: 'Mobile', width: 85 },
  { header: 'Occupation', width: 90 },
  { header: 'DOB', width: 65 },
  { header: 'Gender', width: 55 },
  { header: 'Door No', width: 55 },
  { header: 'Street', width: 110 },
  { header: 'District', width: 85 },
  { header: 'State', width: 85 },
  { header: 'Pincode', width: 65 },
  { header: 'Photo', width: 90 },
  { header: 'Created At', width: 75 }
];


    const startX = 20;
    let y = 100;
    const rowHeight = 25;
    const fontSize = 8; // Reduced font size for table
    const pageBottom = 550;

    // Function to draw table header
    const drawTableHeader = (doc, y) => {
      let x = startX;
      columns.forEach((col, index) => {
        // Draw cell border
        doc.lineWidth(1).rect(x, y, col.width, rowHeight).stroke();
        // Draw header text
        doc.font('Helvetica-Bold').fontSize(fontSize);
        doc.text(col.header, x + 2, y + 2, { width: col.width - 4, height: rowHeight - 4, lineBreak: false });
        x += col.width;

      });
      const processedData = Object.values(families);
      console.log('PDF export: Processed', processedData.length, 'families');

      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=family-data.pdf');

      doc.pipe(res);

      // Title
      let title = 'Family Details Export';
      if (state && state !== 'All' && district && district !== 'All') {
        title = `Family Details – ${state} / ${district}`;
      } else if (state && state !== 'All') {
        title = `Family Details – ${state}`;
      } else if (district && district !== 'All') {
        title = `Family Details – ${district}`;
      }
      doc.font('Helvetica-Bold').fontSize(16).text(title, { align: 'center' });
      doc.moveDown(2);

      if (processedData.length === 0) {
        const message = 'No data available for the selected filters.';
        doc.fontSize(12).text(message);
        doc.end();
        return;
      }

      // Define table columns
      const columns = [
        { header: 'Family ID', width: 60 },
        { header: 'Husband Name', width: 100 },
        { header: 'Husband Occupation', width: 100 },
        { header: 'Husband Mobile', width: 100 },
        { header: 'Address', width: 150 },
        { header: 'Wife Name', width: 100 },
        { header: 'Wife Occupation', width: 100 },
        { header: 'Wife Mobile', width: 100 }
      ];

      const startX = 20;
      let y = 100;
      const rowHeight = 25;
      const fontSize = 8; // Reduced font size for table
      const pageBottom = 550;

      // Function to draw table header
      const drawTableHeader = (doc, y) => {
        let x = startX;
        columns.forEach((col, index) => {
          // Draw cell border
          doc.lineWidth(1).rect(x, y, col.width, rowHeight).stroke();
          // Draw header text
          doc.font('Helvetica-Bold').fontSize(fontSize);
          doc.text(col.header, x + 2, y + 2, { width: col.width - 4, height: rowHeight - 4, lineBreak: false });
          x += col.width;
        });
        return y + rowHeight;
      };

      // Function to draw a row
      const drawRow = (doc, rowData, y) => {
        let x = startX;
        rowData.forEach((cell, index) => {
          // Draw cell border
          doc.lineWidth(1).rect(x, y, columns[index].width, rowHeight).stroke();
          // Draw cell text
          doc.font('Helvetica').fontSize(fontSize);
          doc.text(cell, x + 2, y + 2, { width: columns[index].width - 4, height: rowHeight - 4, lineBreak: false });
          x += columns[index].width;
        });
        return y + rowHeight;
      };

      // Draw initial header
      y = drawTableHeader(doc, y);

      // Draw data rows
      processedData.forEach((family) => {
        // Check if next row exceeds page bottom
        if (y + rowHeight > pageBottom) {
          doc.addPage();
          y = 100;
          y = drawTableHeader(doc, y);
        }

        const rowData = [
          family.family_id ? family.family_id.toString() : '',
          family.husband_name || '',
          family.husband_occupation || '',
          family.husband_mobile || '',
          family.address || '',
          family.wife_name || '',
          family.wife_occupation || '',
          family.wife_mobile || ''
        ];
        y = drawRow(doc, rowData, y);
      });

      doc.end();
    } else {
      // Old format for all data export
      let query = 'SELECT * FROM family_members WHERE 1=1';
      let params = [];
      query += ' ORDER BY family_id, member_type';
      console.log('PDF export: No filters, query:', query, 'params:', params);

      const [data] = await db.query(query, params);
      console.log('PDF export: Fetched', data.length, 'rows from family_members');

      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=family-data.pdf');

      doc.pipe(res);

      // Title
      let title = 'Family Details – All / All';
      doc.font('Helvetica-Bold').fontSize(16).text(title, { align: 'center' });
      doc.moveDown(2);

      if (data.length === 0) {
        const message = 'No data available.';
        doc.fontSize(12).text(message);
        doc.end();
        return;
      }

      // Define table columns with explicit widths to fit A4 landscape (usable width ~802 points)
      const columns = [
        { header: 'ID', width: 35 },
        { header: 'Family ID', width: 45 },
        { header: 'Member Type', width: 60 },
        { header: 'Name', width: 95 },
        { header: 'Relationship', width: 70 },
        { header: 'Mobile', width: 85 },
        { header: 'Occupation', width: 90 },
        { header: 'DOB', width: 65 },
        { header: 'Gender', width: 55 },
        { header: 'Door No', width: 55 },
        { header: 'Street', width: 110 },
        { header: 'District', width: 85 },
        { header: 'State', width: 85 },
        { header: 'Pincode', width: 65 },
        { header: 'Photo', width: 90 },
        { header: 'Created At', width: 75 }
      ];

      const startX = 20;
      let y = 100;
      const rowHeight = 25;
      const fontSize = 8; // Reduced font size for table
      const pageBottom = 550;

      // Function to draw table header
      const drawTableHeader = (doc, y) => {
        let x = startX;
        columns.forEach((col, index) => {
          // Draw cell border
          doc.lineWidth(1).rect(x, y, col.width, rowHeight).stroke();
          // Draw header text
          doc.font('Helvetica-Bold').fontSize(fontSize);
          doc.text(col.header, x + 2, y + 2, { width: col.width - 4, height: rowHeight - 4, lineBreak: false });
          x += col.width;
        });
        return y + rowHeight;
      };

      // Function to draw a row
      const drawRow = (doc, rowData, y) => {
        let x = startX;
        rowData.forEach((cell, index) => {
          // Draw cell border
          doc.lineWidth(1).rect(x, y, columns[index].width, rowHeight).stroke();
          // Draw cell text
          doc.font('Helvetica').fontSize(fontSize);
          doc.text(cell, x + 2, y + 2, { width: columns[index].width - 4, height: rowHeight - 4, lineBreak: false });
          x += columns[index].width;
        });
        return y + rowHeight;
      };

      // Draw initial header
      y = drawTableHeader(doc, y);

      // Draw data rows
      data.forEach((member) => {
        // Check if next row exceeds page bottom
        if (y + rowHeight > pageBottom) {
          doc.addPage();
          y = 100;
          y = drawTableHeader(doc, y);
        }

        const rowData = [
          member.id ? member.id.toString() : '',
          member.family_id ? member.family_id.toString() : '',
          member.member_type || '',
          member.name || '',
          member.relationship || '',
          member.mobile || '',
          member.occupation || '',
          member.dob ? new Date(member.dob).toLocaleDateString() : '',
          member.gender || '',
          member.door_no || '',
          member.street || '',
          member.district || '',
          member.state || '',
          member.pincode ? member.pincode.toString() : '',
          member.photo || '',
          member.created_at ? new Date(member.created_at).toLocaleDateString() : ''
        ];
        y = drawRow(doc, rowData, y);
      });

      doc.end();
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).send('Error exporting data');
  }
};
