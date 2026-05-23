import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type ReportRow = {
  createdAt: Date;
  offer: string;
  offerSlug: string;
  network: string;
  networkOfferId: string;
  leadId: string;
  pageType: string;
  categorySlug: string;
  cardPosition: number | null;
  pageUrl: string;
  redirectUrl: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
};

const HEADERS = [
  "Дата клика",
  "Оффер",
  "Slug",
  "CPA-сеть",
  "Offer ID",
  "Lead ID",
  "Тип страницы",
  "Категория",
  "Позиция",
  "URL страницы",
  "Redirect URL",
  "Referrer",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "UTM Content",
  "UTM Term",
];

const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";
const REPORT_TIME_ZONE_OFFSET = "+07:00";

function parseDate(value: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}${REPORT_TIME_ZONE_OFFSET}`,
  );
}

function formatCellDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: REPORT_TIME_ZONE,
  }).format(value);
}

function csvEscape(value: string | number | null) {
  const text = value === null ? "" : String(value);

  if (/[",\n;]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function xmlEscape(value: string | number | null) {
  return (value === null ? "" : String(value))
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rowsToMatrix(rows: ReportRow[]) {
  return [
    HEADERS,
    ...rows.map((row) => [
      formatCellDate(row.createdAt),
      row.offer,
      row.offerSlug,
      row.network,
      row.networkOfferId,
      row.leadId,
      row.pageType,
      row.categorySlug,
      row.cardPosition,
      row.pageUrl,
      row.redirectUrl,
      row.referrer,
      row.utmSource,
      row.utmMedium,
      row.utmCampaign,
      row.utmContent,
      row.utmTerm,
    ]),
  ];
}

function buildCsv(rows: ReportRow[]) {
  return rowsToMatrix(rows)
    .map((row) => row.map((cell) => csvEscape(cell)).join(";"))
    .join("\n");
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function zipDateTime(date = new Date()) {
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosDate, dosTime };
}

function createZip(entries: { name: string; content: string }[]) {
  const fileParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosDate, dosTime } = zipDateTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const content = Buffer.from(entry.content);
    const crc = crc32(content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    fileParts.push(localHeader, name, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + content.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...fileParts, ...centralParts, end]);
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function buildSheetXml(rows: ReportRow[]) {
  const matrix = rowsToMatrix(rows);
  const sheetData = matrix
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="20" customWidth="1"/>
    <col min="2" max="6" width="22" customWidth="1"/>
    <col min="7" max="17" width="28" customWidth="1"/>
  </cols>
  <sheetData>${sheetData}</sheetData>
</worksheet>`;
}

function buildXlsx(rows: ReportRow[]) {
  return createZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Clicks" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: buildSheetXml(rows),
    },
  ]);
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession();

  if (
    !session ||
    (session.role !== "BOSS" && !session.permissions.includes("analytics"))
  ) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const fromValue = request.nextUrl.searchParams.get("from");
  const toValue = request.nextUrl.searchParams.get("to");
  const from = parseDate(fromValue);
  const to = parseDate(toValue, true);
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  if (!from || !to) {
    return new NextResponse("Некорректный период", { status: 400 });
  }

  const clicks = await prisma.offerClick.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      offer: true,
      affiliateOffer: true,
      lead: true,
    },
  });

  const rows: ReportRow[] = clicks.map((click) => ({
    createdAt: click.createdAt,
    offer: click.offer.brandName,
    offerSlug: click.offer.slug,
    network: click.affiliateOffer?.networkName ?? click.affiliateOffer?.network ?? "",
    networkOfferId: click.affiliateOffer?.networkOfferId ?? "",
    leadId: click.lead.leadId,
    pageType: click.pageType ?? "",
    categorySlug: click.categorySlug ?? "",
    cardPosition: click.cardPosition,
    pageUrl: click.pageUrl ?? "",
    redirectUrl: click.redirectUrl,
    referrer: click.lead.referrer ?? "",
    utmSource: click.lead.utmSource ?? "",
    utmMedium: click.lead.utmMedium ?? "",
    utmCampaign: click.lead.utmCampaign ?? "",
    utmContent: click.lead.utmContent ?? "",
    utmTerm: click.lead.utmTerm ?? "",
  }));

  const fileBase = `zaimkarta-clicks-${fromValue}-${toValue}`;

  if (format === "xlsx") {
    const xlsx = buildXlsx(rows);
    return new NextResponse(xlsx, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileBase}.xlsx"`,
      },
    });
  }

  const csv = "\uFEFF" + buildCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileBase}.csv"`,
    },
  });
}
