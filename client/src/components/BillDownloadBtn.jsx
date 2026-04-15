import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BillDownloadBtn({ group, expenses, settlements, balances }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth ? doc.internal.pageSize.getWidth() : doc.internal.pageSize.width;
      const margin = 14;

      // Primary color
      const primaryColor = [99, 102, 241]; // #6366f1
      const totalAmount = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

      // --- 1. Header Section ---
      doc.setFontSize(24);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Room Split', margin, 22);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Monthly Expense Bill', margin, 28);

      // Group Details on Right
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      const groupName = group?.name || 'Group';
      doc.text(groupName, pageWidth - margin, 22, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' });
      doc.text(`Generated: ${dateStr}`, pageWidth - margin, 28, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 35, pageWidth - margin, 35);

      // --- 2. Summary Section ---
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Summary', margin, 45);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Total Group Expenses: ${group?.currency || 'INR'} ${totalAmount.toFixed(2)}`, margin, 53);
      doc.text(`Total Records: ${expenses.length}`, margin, 59);

      // --- 3. Balances Table ---
      const balancesBody = (balances || []).map(b => {
        const amountStr = `${b.balance > 0 ? '+' : ''}${Math.abs(b.balance).toFixed(0)}`;
        const status = b.balance > 0 ? 'Owed to them' : b.balance < 0 ? 'They Owe' : 'Settled';
        return [b.name, amountStr, status];
      });

      autoTable(doc, {
        startY: 68,
        head: [['Member Name', 'Net Balance', 'Status']],
        body: balancesBody,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 1: { halign: 'right' } }
      });

      // --- 4. Settlement Suggestions ---
      let finalY = doc.lastAutoTable.finalY + 15;
      
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Suggested Settlements', margin, finalY);

      if (settlements && settlements.length > 0) {
        const settlementsBody = settlements.map(s => [
          s.fromName,
          '→ pays →',
          s.toName,
          `${group?.currency || 'INR'} ${s.amount}`
        ]);

        autoTable(doc, {
          startY: finalY + 5,
          head: [['From', '', 'To', 'Amount']],
          body: settlementsBody,
          theme: 'plain',
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 3 },
          columnStyles: { 
            0: { textColor: [239, 68, 68], fontStyle: 'bold' }, // Red for payer
            1: { textColor: [100, 116, 139], halign: 'center' },
            2: { textColor: [16, 185, 129], fontStyle: 'bold' }, // Green for receiver
            3: { fontStyle: 'bold', halign: 'right' }
          }
        });
        finalY = doc.lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(16, 185, 129);
        doc.text('All settled up! No pending payments.', margin, finalY + 8);
        finalY += 20;
      }

      // --- 5. Expense Breakdown Table ---
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Expense Breakdown', margin, finalY);

      const expensesBody = expenses.map(e => [
        new Date(e.date).toLocaleDateString(),
        e.title,
        e.paidBy?.name || 'Unknown',
        e.category || 'other',
        `${e.totalAmount?.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Date', 'Description', 'Paid By', 'Category', 'Amount']],
        body: expensesBody,
        theme: 'striped',
        headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42] },
        styles: { fontSize: 8 },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
      });

      // --- 6. Footer ---
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${i} of ${pageCount} • Generated by Room Split • Smart Expense Splitter`,
          pageWidth / 2,
          (doc.internal.pageSize.getHeight ? doc.internal.pageSize.getHeight() : doc.internal.pageSize.height) - 10,
          { align: 'center' }
        );
      }

      // 7. Save and open
      doc.save(`RoomSplit_${groupName.replace(/\s+/g, '_')}_Bill.pdf`);
      doc.save(`RoomSplit_${groupName.replace(/\s+/g, '_')}_Bill.pdf`);
      return true;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
      return false;
    }
  };

  const handleDownload = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const success = generatePDF();
      setIsGenerating(false);
      if (success) {
        toast.success('Bill downloaded successfully!');
      }
    }, 100);
  };

  const handleShareWhatsApp = () => {
    if (!group || !balances) return;

    let text = `*Room Split - ${group.name}*\n_Monthly Summary_\n\n`;
    text += `*Total Expenses:* ₹${expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0)}\n\n`;
    
    text += `*Net Balances:*\n`;
    balances.forEach(b => {
      if (b.balance > 0) text += `🟩 *${b.name}* gets back ₹${b.balance}\n`;
      else if (b.balance < 0) text += `🟥 *${b.name}* owes ₹${Math.abs(b.balance)}\n`;
      else text += `✅ *${b.name}* is settled\n`;
    });

    if (settlements && settlements.length > 0) {
      text += `\n*How to settle up:*\n`;
      settlements.forEach(s => {
        text += `💸 ${s.fromName} pays ₹${s.amount} to ${s.toName}\n`;
      });
    }

    text += `\n_Generated via Room Split App_`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button 
        className="btn-ghost" 
        onClick={handleShareWhatsApp}
        style={{ color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)' }}
      >
        <Share2 size={16} /> WhatsApp
      </button>
      
      <button 
        className="btn-primary" 
        onClick={handleDownload} 
        disabled={isGenerating || !expenses || expenses.length === 0}
      >
        <Download size={16} />
        {isGenerating ? 'Generating...' : 'Download PDF Bill'}
      </button>
    </div>
  );
}
