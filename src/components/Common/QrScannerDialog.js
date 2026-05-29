import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Stack,
} from '@mui/material';
import ShareBiteBrand from './ShareBiteBrand';

const loadJsQR = () =>
  new Promise((resolve, reject) => {
    if (window.jsQR) {
      resolve(window.jsQR);
      return;
    }
    const existing = document.querySelector('script[data-jsqr]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.jsQR));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.async = true;
    script.dataset.jsqr = 'true';
    script.onload = () => resolve(window.jsQR);
    script.onerror = reject;
    document.head.appendChild(script);
  });

/**
 * Camera QR scanner: BarcodeDetector (Chrome/Edge) with jsQR canvas fallback (Safari/Firefox).
 */
const QrScannerDialog = ({ open, onClose, onScan, title = 'Scan QR code' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const [manualToken, setManualToken] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);

  const stopCamera = () => {
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualToken('');
      setCameraError(null);
      return undefined;
    }

    let cancelled = false;

    const scanWithJsQR = async (video, canvas, jsQR) => {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const tick = () => {
        if (cancelled || !open || !video.videoWidth) {
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          onScan(code.data.trim());
          stopCamera();
          onClose();
          return;
        }
        loopRef.current = requestAnimationFrame(tick);
      };
      loopRef.current = requestAnimationFrame(tick);
    };

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setScanning(true);
        setCameraError(null);

        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const tick = async () => {
            if (cancelled || !open || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              const match = codes.find((c) => c.rawValue);
              if (match?.rawValue) {
                onScan(match.rawValue.trim());
                stopCamera();
                onClose();
                return;
              }
            } catch {
              // frame error
            }
            loopRef.current = requestAnimationFrame(tick);
          };
          loopRef.current = requestAnimationFrame(tick);
          return;
        }

        const jsQR = await loadJsQR();
        if (canvasRef.current && videoRef.current) {
          await scanWithJsQR(videoRef.current, canvasRef.current, jsQR);
        }
      } catch (err) {
        setCameraError(
          'Camera unavailable. Allow camera permission or paste the QR token below.',
        );
      }
    };

    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleManualSubmit = () => {
    const token = manualToken.trim();
    if (!token) return;
    onScan(token);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack spacing={0.5}>
          <ShareBiteBrand variant="h6" />
          <Typography variant="subtitle2">{title}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            minHeight: 260,
            bgcolor: 'grey.900',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 2,
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: 260, objectFit: 'cover' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {scanning && (
            <Box
              sx={{
                position: 'absolute',
                inset: '20%',
                border: '2px dashed',
                borderColor: 'success.light',
                borderRadius: 2,
                pointerEvents: 'none',
              }}
            />
          )}
        </Box>
        {cameraError && (
          <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
            {cameraError}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Or paste the QR token manually:
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="QR token"
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleManualSubmit} disabled={!manualToken.trim()}>
          Use token
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QrScannerDialog;
