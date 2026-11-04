import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export interface CrowdCanvasProps {
  src?: string;
  rows?: number;
  cols?: number;
  className?: string;
}

class Peep {
  image: HTMLImageElement;
  rect: number[] = [0, 0, 0, 0];
  width: number = 0;
  height: number = 0;
  drawArgs: any[] = [];
  x: number = 0;
  y: number = 0;
  anchorY: number = 0;
  scaleX: number = 1;
  walk: gsap.core.Timeline | null = null;

  constructor({ image, rect }: { image: HTMLImageElement; rect: number[] }) {
    this.image = image;
    this.setRect(rect);
  }

  setRect(rect: number[]) {
    this.rect = rect;
    this.width = rect[2];
    this.height = rect[3];
    this.drawArgs = [
      this.image,
      rect[0],
      rect[1],
      rect[2],
      rect[3],
      0,
      0,
      this.width,
      this.height,
    ];
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleX, 1);
    ctx.drawImage(
      this.image,
      this.rect[0],
      this.rect[1],
      this.rect[2],
      this.rect[3],
      -this.width / 2,
      -this.height,
      this.width,
      this.height
    );
    ctx.restore();
  }
}

export const CrowdCanvas: React.FC<CrowdCanvasProps> = ({
  src = '/open-peeps-sheet.png',
  rows = 15,
  cols = 7,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;
    let observer: ResizeObserver | null = null;
    let allPeeps: Peep[] = [];
    let availablePeeps: Peep[] = [];
    let crowd: Peep[] = [];
    const timelines: gsap.core.Timeline[] = [];

    const config = {
      src,
      rows: Math.max(1, rows),
      cols: Math.max(1, cols),
    };

    const stage = {
      width: 0,
      height: 0,
    };

    const randomRange = (min: number, max: number) => min + Math.random() * (max - min);
    const randomIndex = (array: any[]) => (randomRange(0, array.length) | 0);
    const removeFromArray = (array: any[], i: number) => array.splice(i, 1)[0];
    const removeItem = (array: any[], item: any) => removeFromArray(array, array.indexOf(item));

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const resize = () => {
      if (!canvas || !container || isCancelled) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      stage.width = rect.width;
      stage.height = rect.height;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Re-anchor active crowd to bottom of new height
      crowd.forEach((peep) => {
        peep.y = stage.height - peep.height + peep.anchorY;
      });
    };

    const createPeeps = () => {
      const { rows: r, cols: c } = config;
      const w = img.naturalWidth / c;
      const h = img.naturalHeight / r;
      allPeeps = [];

      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          allPeeps.push(
            new Peep({
              image: img,
              rect: [j * w, i * h, w, h],
            })
          );
        }
      }
      availablePeeps = [...allPeeps];
    };

    const resetPeep = ({ peep }: { peep: Peep }) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const offsetY = 100 - 250 * gsap.parseEase('power2.in')(Math.random());
      const startY = stage.height - peep.height + offsetY;
      let startX: number;
      let endX: number;

      if (direction === 1) {
        startX = -peep.width;
        endX = stage.width + peep.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + peep.width;
        endX = -peep.width;
        peep.scaleX = -1;
      }

      peep.x = startX;
      peep.y = startY;
      peep.anchorY = offsetY;

      const xDuration = randomRange(10, 24);
      const yDuration = 0.25;

      const tl = gsap.timeline({
        onComplete: () => {
          if (isCancelled) return;
          removeItem(crowd, peep);
          availablePeeps.push(peep);
          spawnPeep();
        },
      });

      tl.timeScale(randomRange(0.7, 1.3));

      tl.to(
        peep,
        {
          duration: xDuration,
          x: endX,
          ease: 'none',
        },
        0
      );

      tl.to(
        peep,
        {
          duration: yDuration,
          repeat: Math.floor(xDuration / yDuration),
          yoyo: true,
          y: startY - 8,
          ease: 'power1.inOut',
        },
        0
      );

      peep.walk = tl;
      timelines.push(tl);
      return tl;
    };

    const spawnPeep = () => {
      if (isCancelled || availablePeeps.length === 0) return;
      const index = randomIndex(availablePeeps);
      const peep = removeFromArray(availablePeeps, index);
      crowd.push(peep);
      resetPeep({ peep });
    };

    const render = () => {
      if (isCancelled) return;
      ctx.clearRect(0, 0, stage.width, stage.height);

      // Sort by anchorY so background characters sit behind foreground ones
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      for (let i = 0; i < crowd.length; i++) {
        crowd[i].render(ctx);
      }
    };

    img.onload = () => {
      if (isCancelled) return;
      resize();
      createPeeps();

      // Determine initial crowd count based on container width
      const initialCount = Math.min(
        availablePeeps.length,
        Math.max(6, Math.floor(stage.width / 120))
      );

      for (let i = 0; i < initialCount; i++) {
        spawnPeep();
        // Stagger their initial positions randomly across the stage
        if (crowd[i] && crowd[i].walk) {
          crowd[i].walk!.progress(Math.random());
        }
      }

      gsap.ticker.add(render);

      observer = new ResizeObserver(() => {
        resize();
      });
      observer.observe(container);
    };

    img.onerror = () => {
      if (!isCancelled) {
        setLoadError(true);
      }
    };

    img.src = config.src;

    return () => {
      isCancelled = true;
      gsap.ticker.remove(render);
      timelines.forEach((tl) => tl.kill());
      crowd.forEach((p) => {
        if (p.walk) p.walk.kill();
      });
      if (observer) {
        observer.disconnect();
      }
    };
  }, [src, rows, cols]);

  if (loadError) {
    return (
      <div className={`w-full h-full flex items-end justify-center pb-8 opacity-40 pointer-events-none ${className}`}>
        <div className="flex gap-4 items-end">
          {[48, 64, 56, 72, 60, 52, 68].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}px` }}
              className="w-8 rounded-t-full bg-slate-300 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 block pointer-events-none" />
    </div>
  );
};

export const Skiper39: React.FC<CrowdCanvasProps> = (props) => {
  return <CrowdCanvas {...props} />;
};

export default Skiper39;
