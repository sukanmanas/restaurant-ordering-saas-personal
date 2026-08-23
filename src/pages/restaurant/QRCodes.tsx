import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { Card, Button, Input } from "../../components/ui";

const BASE_URL = window.location.origin;
const SLUG = "krua-pa-toi";

const getMenuUrl = (table?: number) =>
  table ? `${BASE_URL}/menu/${SLUG}?table=${table}` : `${BASE_URL}/menu/${SLUG}`;

const QRCard: React.FC<{ label: string; url: string }> = ({ label, url }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const download = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 460;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 50, 30, 300, 300);
      ctx.fillStyle = "#111827";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, canvas.width / 2, 370);
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#6b7280";
      ctx.fillText("สแกนเพื่อสั่งอาหาร", canvas.width / 2, 410);

      const link = document.createElement("a");
      link.download = `qr-${label}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Card className="flex flex-col items-center p-6 gap-4">
      <p className="font-bold text-lg text-text">{label}</p>
      <QRCodeSVG
        ref={svgRef}
        value={url}
        size={180}
        level="H"
        includeMargin
      />
      <p className="text-xs text-text-secondary text-center break-all">{url}</p>
      <Button
        variant="outline"
        size="sm"
        icon={<Download className="w-4 h-4" />}
        onClick={download}
        fullWidth
      >
        ดาวน์โหลด
      </Button>
    </Card>
  );
};

const QRCodes: React.FC = () => {
  const [tableCount, setTableCount] = useState("5");
  const [applied, setApplied] = useState(5);

  const handleApply = () => {
    const n = parseInt(tableCount);
    if (!isNaN(n) && n > 0 && n <= 50) setApplied(n);
  };

  const printAll = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">QR Code โต๊ะ</h2>
          <p className="text-text-secondary">สร้าง QR Code สำหรับแต่ละโต๊ะและ QR ทั่วไป</p>
        </div>
        <Button icon={<Printer className="w-4 h-4" />} onClick={printAll} variant="outline">
          พิมพ์ทั้งหมด
        </Button>
      </div>

      {/* Table count input */}
      <Card className="flex items-end gap-4 p-4">
        <div className="flex-1">
          <Input
            label="จำนวนโต๊ะ"
            type="number"
            min="1"
            max="50"
            value={tableCount}
            onChange={(e) => setTableCount(e.target.value)}
            placeholder="เช่น 10"
          />
        </div>
        <Button onClick={handleApply}>สร้าง QR</Button>
      </Card>

      {/* General QR */}
      <div>
        <h3 className="font-semibold text-text mb-3">QR ทั่วไป (ไม่มีโต๊ะ)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <QRCard label="ทั่วไป / Takeaway" url={getMenuUrl()} />
        </div>
      </div>

      {/* Per-table QRs */}
      <div>
        <h3 className="font-semibold text-text mb-3">QR ประจำโต๊ะ</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: applied }, (_, i) => i + 1).map((table) => (
            <QRCard
              key={table}
              label={`โต๊ะ ${table}`}
              url={getMenuUrl(table)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default QRCodes;
