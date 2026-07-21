import { useEffect, useRef, useState } from 'react';
import QRCodeStyling, { type Options } from 'qr-code-styling';

interface AdvancedQRCodeProps {
  options: Options;
  qrCodeRef?: React.MutableRefObject<QRCodeStyling | null>;
}

export const AdvancedQRCode = ({ options, qrCodeRef }: AdvancedQRCodeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [qrCode] = useState<QRCodeStyling>(() => new QRCodeStyling(options));

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = ''; // Clear previous renders in dev mode strict mode
      qrCode.append(ref.current);
    }
  }, [qrCode]);

  useEffect(() => {
    qrCode.update(options);
  }, [qrCode, options]);
  
  useEffect(() => {
    if (qrCodeRef) {
      qrCodeRef.current = qrCode;
    }
  }, [qrCode, qrCodeRef]);

  return <div ref={ref} />;
};
