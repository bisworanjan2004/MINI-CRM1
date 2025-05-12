import PDFDocument from "pdfkit"

// Generate PDF for quotation
export const generatePDF = (quotation) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 })

      // Buffer to store PDF
      const buffers = []
      doc.on("data", buffers.push.bind(buffers))
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers)
        resolve(pdfData)
      })

      // Add company logo and info
      doc.fontSize(20).text("QUOTATION", { align: "center" })
      doc.moveDown()

      // Add quotation details
      doc.fontSize(12).text(`Quotation #: ${quotation.quotationNumber}`)
      doc.text(`Date: ${new Date(quotation.date).toLocaleDateString()}`)
      doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString()}`)
      doc.moveDown()

      // Add client info
      doc.fontSize(14).text("Client Information", { underline: true })
      doc.fontSize(12).text(`Name: ${quotation.client.name}`)
      doc.text(`Company: ${quotation.client.company}`)
      doc.text(`Email: ${quotation.client.email}`)
      if (quotation.client.address) {
        doc.text(`Address: ${quotation.client.address}`)
      }
      doc.moveDown()

      // Add items table
      doc.fontSize(14).text("Items", { underline: true })
      doc.moveDown()

      // Table headers
      const tableTop = doc.y
      const itemX = 50
      const descriptionX = 100
      const quantityX = 300
      const priceX = 350
      const amountX = 450

      doc
        .fontSize(10)
        .text("Item", itemX, tableTop)
        .text("Description", descriptionX, tableTop)
        .text("Qty", quantityX, tableTop)
        .text("Price", priceX, tableTop)
        .text("Amount", amountX, tableTop)

      // Draw line
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke()

      // Table rows
      let tableRow = tableTop + 25

      quotation.items.forEach((item, i) => {
        doc
          .fontSize(10)
          .text((i + 1).toString(), itemX, tableRow)
          .text(item.description, descriptionX, tableRow, { width: 180 })
          .text(item.quantity.toString(), quantityX, tableRow)
          .text(`$${item.unitPrice.toFixed(2)}`, priceX, tableRow)
          .text(`$${item.amount.toFixed(2)}`, amountX, tableRow)

        tableRow += 20

        // Add a new page if we're at the bottom
        if (tableRow > 700) {
          doc.addPage()
          tableRow = 50
        }
      })

      // Draw line
      doc.moveTo(50, tableRow).lineTo(550, tableRow).stroke()

      tableRow += 15

      // Add totals
      doc
        .fontSize(10)
        .text("Subtotal:", 350, tableRow)
        .text(`$${quotation.subtotal.toFixed(2)}`, amountX, tableRow)

      tableRow += 15

      doc
        .fontSize(10)
        .text("Tax:", 350, tableRow)
        .text(`$${quotation.tax.toFixed(2)}`, amountX, tableRow)

      tableRow += 15

      doc
        .fontSize(12)
        .text("Total:", 350, tableRow, { bold: true })
        .text(`$${quotation.total.toFixed(2)}`, amountX, tableRow, { bold: true })

      doc.moveDown(2)

      // Add notes and terms
      if (quotation.notes) {
        doc.fontSize(12).text("Notes:", { bold: true })
        doc.fontSize(10).text(quotation.notes)
        doc.moveDown()
      }

      if (quotation.terms) {
        doc.fontSize(12).text("Terms and Conditions:", { bold: true })
        doc.fontSize(10).text(quotation.terms)
      }

      // Finalize the PDF
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
