const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const XLSX = require("xlsx");
const JSZip = require("jszip");

/**
 * Helper to extract visual elements (text paragraphs and tables) from PPTX slide XML,
 * resolving nested group coordinates.
 */
function extractSlideElements(slideXmlText) {
  const elements = [];
  const groupStack = [];
  let pos = 0;
  
  while (pos < slideXmlText.length) {
    const nextGrpSp = slideXmlText.indexOf("<p:grpSp>", pos);
    const nextEndGrpSp = slideXmlText.indexOf("</p:grpSp>", pos);
    const nextSp = slideXmlText.indexOf("<p:sp>", pos);
    const nextFrame = slideXmlText.indexOf("<p:graphicFrame>", pos);
    
    const events = [];
    if (nextGrpSp !== -1) events.push({ type: "startGrp", index: nextGrpSp });
    if (nextEndGrpSp !== -1) events.push({ type: "endGrp", index: nextEndGrpSp });
    if (nextSp !== -1) events.push({ type: "startSp", index: nextSp });
    if (nextFrame !== -1) events.push({ type: "startFrame", index: nextFrame });
    
    if (events.length === 0) break;
    
    events.sort((a, b) => a.index - b.index);
    const ev = events[0];
    
    if (ev.type === "startGrp") {
      const endPr = slideXmlText.indexOf("</p:grpSpPr>", ev.index);
      if (endPr === -1) {
        pos = ev.index + 9;
        continue;
      }
      const grpPrXml = slideXmlText.substring(ev.index, endPr);
      
      const offMatch = grpPrXml.match(/<a:off\s+x="([^"]+)"\s+y="([^"]+)"\s*\/>/);
      const chOffMatch = grpPrXml.match(/<a:chOff\s+x="([^"]+)"\s+y="([^"]+)"\s*\/>/);
      const extMatch = grpPrXml.match(/<a:ext\s+cx="([^"]+)"\s+cy="([^"]+)"\s*\/>/);
      const chExtMatch = grpPrXml.match(/<a:chExt\s+cx="([^"]+)"\s+cy="([^"]+)"\s*\/>/);
      
      groupStack.push({
        offX: offMatch ? parseInt(offMatch[1], 10) : 0,
        offY: offMatch ? parseInt(offMatch[2], 10) : 0,
        chOffX: chOffMatch ? parseInt(chOffMatch[1], 10) : 0,
        chOffY: chOffMatch ? parseInt(chOffMatch[2], 10) : 0,
        extCx: extMatch ? parseInt(extMatch[1], 10) : 1,
        chExtCx: chExtMatch ? parseInt(chExtMatch[1], 10) : 1,
      });
      pos = ev.index + 9;
    } else if (ev.type === "endGrp") {
      groupStack.pop();
      pos = ev.index + 10;
    } else if (ev.type === "startSp") {
      const endSpIndex = slideXmlText.indexOf("</p:sp>", ev.index);
      if (endSpIndex === -1) {
        pos = ev.index + 6;
        continue;
      }
      const spXml = slideXmlText.substring(ev.index, endSpIndex + 7);
      
      const pMatches = spXml.match(/<a:p[\s>][\s\S]*?<\/a:p>/g) || [];
      const paragraphs = [];
      let maxSz = 0;
      
      // Extract shape fill color if any
      const srgbMatch = spXml.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{6})"/);
      const shapeColor = srgbMatch ? `#${srgbMatch[1]}` : null;
      
      for (const pXml of pMatches) {
        const tMatches = pXml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
        const text = tMatches.map(m => m.replace(/<\/?a:t>/g, "")).join("");
        if (text.trim().length > 0) {
          // Paragraph or run specific color
          const pColorMatch = pXml.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{6})"/);
          const pColor = pColorMatch ? `#${pColorMatch[1]}` : shapeColor;
          
          const szMatches = pXml.match(/sz="(\d+)"/g) || [];
          const sizes = szMatches.map(m => parseInt(m.match(/\d+/)[0], 10));
          const pSz = sizes.length > 0 ? Math.max(...sizes) : 0;
          if (pSz > maxSz) maxSz = pSz;
          
          const isBold = pXml.includes('b="1"') || pXml.includes('b="true"');
          const isItalic = pXml.includes('i="1"') || pXml.includes('i="true"');
          
          const hasBuNone = pXml.includes('<a:buNone/>') || pXml.includes('<a:buNone');
          const hasBuChar = pXml.includes('<a:buChar') || pXml.includes('<a:buFont') || pXml.includes('<a:buAutoNum');
          const startsWithBullet = /^[•\-\*]/.test(text.trim());
          const isBullet = !hasBuNone && (hasBuChar || startsWithBullet);
          
          paragraphs.push({
            text: text.trim(),
            color: pColor,
            fontSize: pSz > 0 ? Math.round(pSz / 100) : 0,
            isBold,
            isItalic,
            isBullet
          });
        }
      }
      
      if (paragraphs.length > 0) {
        const offMatch = spXml.match(/<a:off\s+x="([^"]+)"\s+y="([^"]+)"\s*\/>/);
        let x = offMatch ? parseInt(offMatch[1], 10) : 0;
        let y = offMatch ? parseInt(offMatch[2], 10) : 0;
        
        for (let i = groupStack.length - 1; i >= 0; i--) {
          const grp = groupStack[i];
          x = grp.offX + (x - grp.chOffX) * (grp.extCx / grp.chExtCx);
          y = grp.offY + (y - grp.chOffY) * (grp.extCx / grp.chExtCx);
        }
        
        const isTitle = spXml.includes('type="title"') || spXml.includes('type="ctrTitle"');
        elements.push({
          type: "text",
          x: Math.round(x),
          y: Math.round(y),
          sz: maxSz,
          isTitle: isTitle,
          content: paragraphs
        });
      }
      pos = endSpIndex + 7;
    } else if (ev.type === "startFrame") {
      const endFrameIndex = slideXmlText.indexOf("</p:graphicFrame>", ev.index);
      if (endFrameIndex === -1) {
        pos = ev.index + 17;
        continue;
      }
      const frameXml = slideXmlText.substring(ev.index, endFrameIndex + 17);
      
      if (frameXml.includes("<a:tbl>")) {
        const tblMatches = frameXml.match(/<a:tbl>([\s\S]*?)<\/a:tbl>/g) || [];
        for (const tblXml of tblMatches) {
          const trMatches = tblXml.match(/<a:tr[\s>][\s\S]*?<\/a:tr>/g) || [];
          const rows = [];
          
          for (const trXml of trMatches) {
            const tcMatches = trXml.match(/<a:tc[\s>][\s\S]*?<\/a:tc>/g) || [];
            const cells = [];
            for (const tcXml of tcMatches) {
              const tMatches = tcXml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
              const cellText = tMatches.map(m => m.replace(/<\/?a:t>/g, "")).join("").trim();
              cells.push(cellText);
            }
            rows.push(cells);
          }
          
          if (rows.length > 0) {
            const offMatch = frameXml.match(/<a:off\s+x="([^"]+)"\s+y="([^"]+)"\s*\/>/);
            let x = offMatch ? parseInt(offMatch[1], 10) : 0;
            let y = offMatch ? parseInt(offMatch[2], 10) : 0;
            
            for (let i = groupStack.length - 1; i >= 0; i--) {
              const grp = groupStack[i];
              x = grp.offX + (x - grp.chOffX) * (grp.extCx / grp.chExtCx);
              y = grp.offY + (y - grp.chOffY) * (grp.extCx / grp.chExtCx);
            }
            
            elements.push({
              type: "table",
              x: Math.round(x),
              y: Math.round(y),
              sz: 0,
              content: rows
            });
          }
        }
      }
      pos = endFrameIndex + 17;
    }
  }
  
  if (elements.length === 0) {
    const pMatches = slideXmlText.match(/<a:p[\s>][\s\S]*?<\/a:p>/g) || [];
    const fallbackParagraphs = [];
    for (const pXml of pMatches) {
      const tMatches = pXml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
      const text = tMatches.map((m) => m.replace(/<\/?a:t>/g, "")).join("").trim();
      if (text) {
        const isBold = pXml.includes('b="1"') || pXml.includes('b="true"');
        fallbackParagraphs.push({
          text,
          color: "#1e293b",
          fontSize: 14,
          isBold,
          isItalic: false,
          isBullet: false,
        });
      }
    }
    if (fallbackParagraphs.length > 0) {
      elements.push({
        type: "text",
        x: 0,
        y: 0,
        sz: 14,
        isTitle: false,
        content: fallbackParagraphs,
      });
    }
  }

  return elements;
}

/**
 * Format table rows into styled HTML table.
 */
function formatTableHtml(rows) {
  let html = `<div style="overflow-x: auto; margin-top: 16px; margin-bottom: 16px; width: 100%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); border-radius: 8px; border: 1px solid #e2e8f0;">`;
  html += `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; color: #334155; font-family: inherit;">`;
  
  if (rows.length > 0) {
    html += `<thead style="background-color: #f8fafc; border-bottom: 2px solid #e2eef6;"><tr>`;
    for (const cell of rows[0]) {
      html += `<th style="padding: 12px 16px; font-weight: 600; color: #1e293b; border-right: 1px solid #e2e8f0;">${cell}</th>`;
    }
    html += `</tr></thead>`;
    
    html += `<tbody style="background-color: #ffffff;">`;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const isEven = r % 2 === 0;
      const bg = isEven ? '#f8fafc' : '#ffffff';
      html += `<tr style="background-color: ${bg}; border-bottom: 1px solid #e2e8f0;">`;
      for (const cell of row) {
        html += `<td style="padding: 10px 16px; border-right: 1px solid #e2e8f0; line-height: 1.5; vertical-align: top; word-break: normal; overflow-wrap: break-word;">${cell}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody>`;
  }
  html += `</table></div>`;
  return html;
}

function formatTextElementHtml(paragraphs, isSlideshow) {
  const spacing = isSlideshow ? "14px" : "10px";
  const liSpacing = isSlideshow ? "8px" : "5px";
  const defaultFontSize = isSlideshow ? "16px" : "14px";

  let html = "";
  let inBulletList = false;

  const closeListIfOpen = () => {
    if (inBulletList) {
      html += `</ul>`;
      inBulletList = false;
    }
  };

  for (const pObj of paragraphs) {
    const rawText = typeof pObj === "string" ? pObj : pObj.text;
    if (!rawText || rawText.trim().length === 0) continue;

    const text = rawText.trim().replace(/^[•\-\*\s]+/, "").trim();
    const color = (typeof pObj === "object" && pObj.color) ? pObj.color : "#1e293b";
    const isBold = typeof pObj === "object" ? pObj.isBold : false;
    const isItalic = typeof pObj === "object" ? pObj.isItalic : false;
    const isBullet = typeof pObj === "object" ? pObj.isBullet : false;
    const customSize = (typeof pObj === "object" && pObj.fontSize && pObj.fontSize > 0) ? `${pObj.fontSize}px` : defaultFontSize;

    let fontStyleCss = "";
    if (isItalic || text.startsWith('"') || text.startsWith('“') || text.startsWith("'")) {
      fontStyleCss += "font-style: italic; ";
    }
    if (isBold) {
      fontStyleCss += "font-weight: 700; ";
    }

    let contentHtml = text;
    const colonIndex = text.indexOf(":");
    if (colonIndex > 0 && colonIndex <= 45 && !text.startsWith('"') && !text.startsWith('“')) {
      const keyword = text.substring(0, colonIndex).trim();
      const desc = text.substring(colonIndex + 1).trim();
      contentHtml = `<strong style="color: #0f172a; font-weight: 700;">${keyword}</strong>: ${desc}`;
    }

    if (isBullet) {
      if (!inBulletList) {
        html += `<ul style="margin: 0 0 ${spacing} 0; padding-left: 24px; text-align: left; font-family: system-ui, -apple-system, sans-serif; color: ${color}; font-size: ${customSize}; line-height: 1.6;">`;
        inBulletList = true;
      }
      html += `<li style="margin-bottom: ${liSpacing}; font-family: inherit; color: ${color}; ${fontStyleCss}">${contentHtml}</li>`;
    } else {
      closeListIfOpen();
      html += `<p style="margin: 0 0 ${spacing} 0; font-family: system-ui, -apple-system, sans-serif; font-size: ${customSize}; color: ${color}; line-height: 1.6; ${fontStyleCss}">${contentHtml}</p>`;
    }
  }

  closeListIfOpen();
  return html;
}

/**
 * Helper to process text runs and tables, identify title, sort elements visually,
 * and format into slide text HTML.
 */
function buildSlideBodyHtml(elements, isSlideshow = true) {
  if (elements.length === 0) return { title: "", bodyHtml: "", hasBodyContent: false };
  
  // 1. Identify title element:
  // First check if any text element has isTitle = true
  let titleIdx = elements.findIndex(e => e.type === "text" && e.isTitle);
  if (titleIdx === -1) {
    titleIdx = elements.findIndex(e => e.type === "text" && e.sz >= 2400);
  }
  
  let title = "";
  let titleColor = null;
  let remaining = elements;

  if (titleIdx !== -1) {
    const titleElement = elements[titleIdx];
    if (titleElement && titleElement.content.length > 0) {
      const firstP = titleElement.content[0];
      title = typeof firstP === "string" ? firstP : firstP.text;
      titleColor = (typeof firstP === "object" && firstP.color) ? firstP.color : null;
    }
    remaining = elements.filter((_, i) => i !== titleIdx);
    if (titleElement && titleElement.content.length > 1) {
      remaining.push({
        type: "text",
        x: titleElement.x,
        y: titleElement.y + 1,
        sz: titleElement.sz,
        isTitle: false,
        content: titleElement.content.slice(1)
      });
    }
  }
  
  // Sort remaining elements: row grouping with 500000 units tolerance, then x
  remaining.sort((a, b) => a.y - b.y);
  
  const rows = [];
  let currentRow = [];
  
  for (const el of remaining) {
    if (currentRow.length === 0) {
      currentRow.push(el);
    } else {
      const diff = el.y - currentRow[0].y;
      if (diff < 500000) {
        currentRow.push(el);
      } else {
        rows.push(currentRow);
        currentRow = [el];
      }
    }
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }
  
  // Sort each row horizontally
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
  }
  
  const titleFontSize = isSlideshow ? "28px" : "22px";
  const titleMargin = isSlideshow ? "20px" : "14px";
  
  let textHtml = "";
  if (title && title.trim().length > 0) {
    const titleStyleColor = titleColor || "#0066cc";
    textHtml += `<h2 style="color: ${titleStyleColor}; font-size: ${titleFontSize}; font-weight: 700; margin-top: 0; margin-bottom: ${titleMargin}; font-family: system-ui, -apple-system, sans-serif; word-break: normal; overflow-wrap: break-word; line-height: 1.3;">${title}</h2>`;
  }
  
  let hasBodyContent = false;
  if (rows.length > 0) {
    hasBodyContent = true;
    textHtml += `<div style="text-align: left; font-family: inherit; color: #2C4B66; font-size: 14px; line-height: 1.6; display: flex; flex-direction: column; gap: ${isSlideshow ? "16px" : "12px"};">`;
    
    for (const row of rows) {
      if (row.length === 1) {
        // Full width element (e.g. paragraph, list, table)
        const el = row[0];
        if (el.type === "table") {
          textHtml += formatTableHtml(el.content);
        } else {
          textHtml += formatTextElementHtml(el.content, isSlideshow);
        }
      } else if (row.length === 2) {
        // 2 column layout: left and right
        const left = row[0];
        const right = row[1];
        
        const leftText = left.content.join(" ").trim();
        const leftIsShort = leftText.length <= 50 && left.content.length === 1;
        const spacing = isSlideshow ? "16px" : "12px";
        
        textHtml += `<div style="display: flex; flex-direction: row; gap: 20px; align-items: stretch; width: 100%; box-sizing: border-box; margin-bottom: ${spacing};">`;
        if (leftIsShort) {
          // Styled keyword/label badge
          textHtml += `
            <div style="flex: 0.3; background: #f8fafc; border-left: 4px solid #3b8db3; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; font-weight: 700; color: #1e293b; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); min-height: 50px; box-sizing: border-box;">
              ${leftText}
            </div>
            <div style="flex: 0.7; display: flex; flex-direction: column; justify-content: center; min-width: 0; box-sizing: border-box;">
              ${right.type === "table" ? formatTableHtml(right.content) : formatTextElementHtml(right.content, isSlideshow)}
            </div>
          `;
        } else {
          // Regular side-by-side columns
          textHtml += `
            <div style="flex: 1; min-width: 0; box-sizing: border-box;">
              ${left.type === "table" ? formatTableHtml(left.content) : formatTextElementHtml(left.content, isSlideshow)}
            </div>
            <div style="flex: 1; min-width: 0; box-sizing: border-box;">
              ${right.type === "table" ? formatTableHtml(right.content) : formatTextElementHtml(right.content, isSlideshow)}
            </div>
          `;
        }
        textHtml += `</div>`;
      } else {
        // Multi-column layout (3 or more)
        const spacing = isSlideshow ? "16px" : "12px";
        textHtml += `<div style="display: flex; flex-direction: row; gap: 16px; align-items: stretch; width: 100%; box-sizing: border-box; margin-bottom: ${spacing};">`;
        for (const el of row) {
          textHtml += `
            <div style="flex: 1; min-width: 0; box-sizing: border-box;">
              ${el.type === "table" ? formatTableHtml(el.content) : formatTextElementHtml(el.content, isSlideshow)}
            </div>
          `;
        }
        textHtml += `</div>`;
      }
    }
    
    textHtml += `</div>`;
  }
  
  return { title, bodyHtml: textHtml, hasBodyContent };
}

/**
 * Extracts slides from a PPTX file and returns styled HTML.
 */
async function extractPptxSlidesHtml(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    
    const slideFiles = Object.keys(zip.files).filter((name) => {
      const n = name.toLowerCase();
      return (
        (n.startsWith("ppt/slides/slide") || n.includes("/slides/slide") || n.includes("slides/slide")) &&
        n.endsWith(".xml") &&
        !n.includes("_rels") &&
        !n.includes("slidelayout") &&
        !n.includes("slidemaster")
      );
    });

    if (slideFiles.length === 0) {
      return "<p style='color: #6b89a0; text-align: center;'>No slides found in this presentation.</p>";
    }

    slideFiles.sort((a, b) => {
      const numA = parseInt((a.match(/slide_?(\d+)\.xml$/i) || [])[1] || "0", 10);
      const numB = parseInt((b.match(/slide_?(\d+)\.xml$/i) || [])[1] || "0", 10);
      return numA - numB;
    });

    let slidesHtml = [];
    for (let i = 0; i < slideFiles.length; i++) {
      const slidePath = slideFiles[i];
      const slideXmlText = await zip.files[slidePath].async("text");
      
      const elements = extractSlideElements(slideXmlText);
      const { bodyHtml } = buildSlideBodyHtml(elements, false);

      // Check relationships to find media images
      const relPath = slidePath.replace("slides/slide", "slides/_rels/slide") + ".rels";
      let imagesHtml = [];
      if (zip.files[relPath]) {
        const relsXmlText = await zip.files[relPath].async("text");
        const relMatches = relsXmlText.match(/Target="([^"]+)"/g) || [];
        for (const match of relMatches) {
          const target = match.replace('Target="', '').replace('"', '');
          if (target.includes("media/")) {
            const zipImgPath = target.replace("../", "ppt/");
            if (zip.files[zipImgPath]) {
              const imgBuffer = await zip.files[zipImgPath].async("nodebuffer");
              
              // Skip small SVG files that are purely decorative shapes (under 2000 bytes)
              if (target.toLowerCase().endsWith(".svg") && imgBuffer.length < 2000) {
                continue;
              }

              const base64Img = imgBuffer.toString("base64");
              let imgMime = "image/png";
              if (target.endsWith(".jpg") || target.endsWith(".jpeg")) imgMime = "image/jpeg";
              if (target.endsWith(".gif")) imgMime = "image/gif";
              if (target.endsWith(".svg")) imgMime = "image/svg+xml";

              imagesHtml.push(`
                <div style="text-align: center; margin-top: 16px;">
                  <img src="data:${imgMime};base64,${base64Img}" style="max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); object-fit: contain;" alt="Slide Image" />
                </div>
              `);
            }
          }
        }
      }
      
      slidesHtml.push(`
        <div class="pptx-slide" style="border: 1px solid #d4e7f5; border-radius: 12px; padding: 24px; margin-bottom: 24px; background: linear-gradient(135deg, #ffffff 0%, #f4f9fd 100%); box-shadow: 0 4px 12px rgba(59,141,179,0.05); min-height: 180px; display: flex; flex-direction: column; justify-content: flex-start; text-align: left;">
          <h4 style="color: #3b8db3; border-bottom: 1px solid #e2eef6; padding-bottom: 8px; margin-top: 0; font-size: 16px;">Slide ${i + 1}</h4>
          <div style="font-size: 14px; color: #2C4B66; line-height: 1.6; font-family: inherit; margin-bottom: 8px;">
            ${bodyHtml || (imagesHtml.length === 0 ? "<span style='color: #9ca3af; font-style: italic;'>[Empty Slide]</span>" : "")}
          </div>
          ${imagesHtml.join("")}
        </div>
      `);
    }

    return `
      <div style="max-height: 100%; overflow-y: auto; padding: 12px 4px;">
        <h3 style="color: #2c4b66; margin-bottom: 16px; font-size: 18px;">Presentation Slides Preview</h3>
        ${slidesHtml.join("")}
      </div>
    `;
  } catch (error) {
    console.error("Error reading PPTX file:", error);
    return `<p style='color: #ef4444;'>Failed to parse presentation file: ${error.message}</p>`;
  }
}

/**
 * Extracts slides from a PPTX file and returns an array of slide HTMLs.
 */
async function extractPptxSlidesArray(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    
    const slideFiles = Object.keys(zip.files).filter((name) => {
      const n = name.toLowerCase();
      return (
        (n.startsWith("ppt/slides/slide") || n.includes("/slides/slide") || n.includes("slides/slide")) &&
        n.endsWith(".xml") &&
        !n.includes("_rels") &&
        !n.includes("slidelayout") &&
        !n.includes("slidemaster")
      );
    });

    if (slideFiles.length === 0) {
      return [];
    }

    slideFiles.sort((a, b) => {
      const numA = parseInt((a.match(/slide_?(\d+)\.xml$/i) || [])[1] || "0", 10);
      const numB = parseInt((b.match(/slide_?(\d+)\.xml$/i) || [])[1] || "0", 10);
      return numA - numB;
    });

    let slides = [];
    for (let i = 0; i < slideFiles.length; i++) {
      const slidePath = slideFiles[i];
      const slideXmlText = await zip.files[slidePath].async("text");
      
      const elements = extractSlideElements(slideXmlText);
      const { bodyHtml, hasBodyContent } = buildSlideBodyHtml(elements, true);

      // Check relationships to find media images
      const relPath = slidePath.replace("slides/slide", "slides/_rels/slide") + ".rels";
      let imagesHtml = [];
      if (zip.files[relPath]) {
        const relsXmlText = await zip.files[relPath].async("text");
        const relMatches = relsXmlText.match(/Target="([^"]+)"/g) || [];
        for (const match of relMatches) {
          const target = match.replace('Target="', '').replace('"', '');
          if (target.includes("media/")) {
            const zipImgPath = target.replace("../", "ppt/");
            if (zip.files[zipImgPath]) {
              const imgBuffer = await zip.files[zipImgPath].async("nodebuffer");
              
              // Skip small SVG files that are purely decorative shapes (under 2000 bytes)
              if (target.toLowerCase().endsWith(".svg") && imgBuffer.length < 2000) {
                continue;
              }

              const base64Img = imgBuffer.toString("base64");
              let imgMime = "image/png";
              if (target.endsWith(".jpg") || target.endsWith(".jpeg")) imgMime = "image/jpeg";
              if (target.endsWith(".gif")) imgMime = "image/gif";
              if (target.endsWith(".svg")) imgMime = "image/svg+xml";

              imagesHtml.push(`
                <img src="data:${imgMime};base64,${base64Img}" alt="Slide Image" />
              `);
            }
          }
        }
      }

      // Scale images to fit side-by-side or center based on count
      let formattedImagesHtml = "";
      if (imagesHtml.length > 0) {
        const imgStyle = `max-width: ${Math.floor(96 / imagesHtml.length)}%; max-height: 90%; width: auto; height: auto; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin: 0 4px;`;
        const formattedImgs = imagesHtml.map(img => img.replace('alt="Slide Image"', `style="${imgStyle}" alt="Slide Image"`));
        formattedImagesHtml = `
          <div style="display: flex; flex-direction: row; justify-content: center; align-items: center; width: 100%; height: 100%; overflow: hidden;">
            ${formattedImgs.join("")}
          </div>
        `;
      }
      
      // Assemble slide body in horizontal presentation layout
      let slideBody = "";
      if (hasBodyContent && imagesHtml.length > 0) {
        // Horizontal side-by-side flex layout
        slideBody = `
          <div style="display: flex; flex-direction: row; gap: 24px; width: 100%; height: 100%; align-items: stretch; justify-content: space-between; overflow: hidden; box-sizing: border-box;">
            <div style="flex: 1.2; display: flex; flex-direction: column; text-align: left; overflow-y: auto; max-height: 100%; padding-right: 8px;">
              ${bodyHtml}
            </div>
            <div style="flex: 0.8; display: flex; justify-content: center; align-items: center; height: 100%; overflow: hidden;">
              ${formattedImagesHtml}
            </div>
          </div>
        `;
      } else if (imagesHtml.length > 0) {
        // Image-centric layout: Title at top (if exists), images centered below
        slideBody = `
          <div style="display: flex; flex-direction: column; width: 100%; height: 100%; justify-content: flex-start; box-sizing: border-box; overflow: hidden;">
            ${bodyHtml}
            <div style="flex: 1; display: flex; justify-content: center; align-items: center; min-height: 0; overflow: hidden; margin-top: 12px;">
              ${formattedImagesHtml}
            </div>
          </div>
        `;
      } else {
        // Text-only
        slideBody = `
          <div style="width: 100%; height: 100%; text-align: left; overflow-y: auto; display: flex; flex-direction: column;">
            ${bodyHtml}
          </div>
        `;
      }
      
      slides.push(slideBody);
    }

    return slides;
  } catch (error) {
    console.error("Error reading PPTX file to slides array:", error);
    return [];
  }
}

/**
 * Returns HTML or metadata for rendering a preview of the file.
 * @param {string} filePath - Absolute path to the file.
 * @param {string} fileName - Original name of the file.
 * @returns {Promise<object>} - Preview data.
 */
async function generatePreviewData(filePath, fileName) {
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found on server.");
  }

  const ext = path.extname(fileName || filePath).toLowerCase();
  
  if (ext === ".pdf") {
    return { previewType: "pdf" };
  }
  
  if (ext === ".txt") {
    const textContent = fs.readFileSync(filePath, "utf-8");
    return { previewType: "txt", text: textContent };
  }

  if (ext === ".docx") {
    return { previewType: "docx" };
  }

  if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawHtml = XLSX.utils.sheet_to_html(sheet);
    // Wrap inside standard styled tables
    const styledHtml = `
      <div class="xlsx-preview" style="text-align: left; padding: 12px; overflow-x: auto; background: #fff;">
        <h4 style="color: #2c4b66; margin-top: 0; margin-bottom: 12px; font-size: 15px;">Sheet: ${sheetName}</h4>
        <style>
          .xlsx-preview table { border-collapse: collapse; width: 100%; font-size: 13px; color: #2C4B66; border: 1px solid #e2eef6; }
          .xlsx-preview th, .xlsx-preview td { border: 1px solid #e2eef6; padding: 8px 12px; text-align: left; }
          .xlsx-preview tr:nth-child(even) { background-color: #f8fafc; }
        </style>
        ${rawHtml}
      </div>
    `;
    return { previewType: "html", html: styledHtml };
  }

  if (ext === ".pptx") {
    const slides = await extractPptxSlidesArray(filePath);
    const htmlContent = await extractPptxSlidesHtml(filePath);
    return { previewType: "pptx", slides: slides, html: htmlContent };
  }

  const imageExts = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"];
  if (imageExts.includes(ext)) {
    let mimeType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    if (ext === ".gif") mimeType = "image/gif";
    if (ext === ".svg") mimeType = "image/svg+xml";
    if (ext === ".webp") mimeType = "image/webp";
    
    return { previewType: "image", mimeType };
  }

  const videoExts = [".mp4", ".webm", ".avi", ".mov", ".mkv"];
  if (videoExts.includes(ext)) {
    let mimeType = "video/mp4";
    if (ext === ".webm") mimeType = "video/webm";
    if (ext === ".avi") mimeType = "video/x-msvideo";
    if (ext === ".mov") mimeType = "video/quicktime";
    if (ext === ".mkv") mimeType = "video/x-matroska";
    return { previewType: "video", mimeType };
  }

  const audioExts = [".mp3", ".wav", ".ogg", ".aac", ".flac", ".m4a", ".wma"];
  if (audioExts.includes(ext)) {
    let mimeType = "audio/mpeg";
    if (ext === ".wav") mimeType = "audio/wav";
    if (ext === ".ogg") mimeType = "audio/ogg";
    if (ext === ".aac") mimeType = "audio/aac";
    if (ext === ".flac") mimeType = "audio/flac";
    if (ext === ".m4a") mimeType = "audio/mp4";
    if (ext === ".wma") mimeType = "audio/x-ms-wma";
    return { previewType: "audio", mimeType };
  }

  return { previewType: "unsupported" };
}

module.exports = {
  generatePreviewData
};
