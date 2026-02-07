
// Helper to access global libraries loaded via CDN in index.html
declare global {
  interface Window {
    pdfjsLib: any;
    mammoth: any;
  }
}

export const extractTextFromFile = async (file: File): Promise<string> => {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (name.endsWith('.txt') || type === 'text/plain') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  if (name.endsWith('.pdf') || type === 'application/pdf') {
    if (!window.pdfjsLib) throw new Error("PDF parser not loaded");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + "\n";
    }
    return fullText;
  }

  if (name.endsWith('.docx') || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    if (!window.mammoth) throw new Error("Docx parser not loaded");
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  throw new Error("Unsupported file type");
};
