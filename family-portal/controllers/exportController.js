const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Admin = require('../models/admin');

exports.exportToExcel = (req, res) => {
  // Get all data by setting a very large limit
  Admin.getAll(1, 10000, (err, data) => {
    if (err) {
      console.error('Error fetching data for export:', err);
      return res.status(500).send('Error exporting data');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Family Data');

    // Add headers
    worksheet.columns = [
      { header: 'Family ID', key: 'family_id', width: 10 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Wife Name', key: 'wife_name', width: 20 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Occupation', key: 'occupation', width: 20 },
      { header: 'Date of Birth', key: 'dob', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'District', key: 'district', width: 15 },
      { header: 'State', key: 'state', width: 15 }
    ];

    // Add rows
    data.results.forEach(member => {
      // Add parent row
      worksheet.addRow({
        family_id: member.id,
        type: 'Parent',
        name: member.name,
        wife_name: member.wife_name || '',
        mobile: member.mobile,
        occupation: member.occupation,
        dob: '',
        gender: '',
        district: member.district,
        state: member.state
      });

      // Get children for this family
      Admin.getChildrenByParentId(member.id, (err2, children) => {
        if (!err2 && children) {
          children.forEach(child => {
            worksheet.addRow({
              family_id: member.id,
              type: 'Child',
              name: child.name,
              wife_name: '',
              mobile: '',
              occupation: child.occupation || '',
              dob: child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString() : '',
              gender: child.gender || '',
              district: '',
              state: ''
            });
          });
        }
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=family-data.xlsx');

    workbook.xlsx.write(res).then(() => {
      res.end();
    });
  });
};

exports.exportToPdf = (req, res) => {
  // Get all data by setting a very large limit
  Admin.getAll(1, 10000, (err, data) => {
    if (err) {
      console.error('Error fetching data for export:', err);
      return res.status(500).send('Error exporting data');
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=family-data.pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Family Data Export', { align: 'center' });
    doc.moveDown();

    data.results.forEach((member, index) => {
      doc.fontSize(12).text(`Family ${index + 1}:`);
      doc.text(`Name: ${member.name}`);
      doc.text(`Wife Name: ${member.wife_name || 'N/A'}`);
      doc.text(`Mobile: ${member.mobile}`);
      doc.text(`Occupation: ${member.occupation}`);
      doc.text(`District: ${member.district}`);
      doc.text(`State: ${member.state}`);
      doc.text(`Children Count: ${member.children_count || 0}`);
      doc.moveDown();
    });

    doc.end();
  });
};
