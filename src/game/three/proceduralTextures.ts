/**
 * Procedural texture generators using HTML5 Canvas.
 * Strictly zero external image files or 404 dependencies.
 */
import * as THREE from 'three';

export function createFloorPanelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark metallic background
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, 512, 512);

  // Metal plate grid
  ctx.strokeStyle = '#182635';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 504);

  // Rivets at corners
  ctx.fillStyle = '#22384d';
  const rivetCoords = [
    [16, 16], [496, 16], [16, 496], [496, 496],
    [256, 16], [256, 496], [16, 256], [496, 256],
  ];
  for (const [rx, ry] of rivetCoords) {
    ctx.beginPath();
    ctx.arc(rx, ry, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cross tread pattern
  ctx.strokeStyle = '#111c27';
  ctx.lineWidth = 2;
  for (let i = 32; i < 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 8);
    ctx.lineTo(i, 504);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(8, i);
    ctx.lineTo(504, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createHazardStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#f59e0b';
  for (let x = -256; x < 512; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x + 24 - 256, 256);
    ctx.lineTo(x - 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWaterRippleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#021019';
  ctx.fillRect(0, 0, 256, 256);

  // Concentric caustic ripples
  for (let i = 0; i < 18; i++) {
    const cx = Math.random() * 256;
    const cy = Math.random() * 256;
    const r = 20 + Math.random() * 40;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
    grad.addColorStop(0.6, 'rgba(0, 180, 220, 0.08)');
    grad.addColorStop(1, 'rgba(2, 16, 25, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createScanlineGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
  ctx.lineWidth = 1;

  ctx.strokeRect(0, 0, 128, 128);

  for (let y = 8; y < 128; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
