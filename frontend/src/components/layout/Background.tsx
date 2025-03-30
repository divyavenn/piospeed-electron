import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

interface BackgroundProps {
  children?: React.ReactNode;
}

const BackgroundContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  overflow: hidden;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

const ContentLayer = styled.div`
  position: relative;
  z-index: 1;
`;

// Network background with animated nodes
const Background: React.FC<BackgroundProps> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      
      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      ctx.scale(dpr, dpr);
    };

    // Initialize canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Generate nodes for the network
    const nodeCount = 120;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.5 + 1,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      color: Math.random() > 0.7 ? '#5D7FFF' : (Math.random() > 0.5 ? '#3961FB' : '#4A3EE8'),
      pulseSpeed: 0.01 + Math.random() * 0.02,
      pulseDirection: 1,
      pulseSize: 0
    }));

    // Animation function
    const animate = () => {
      if (!canvas || !ctx) return;

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      
      // Dark navy blue background
      ctx.fillStyle = '#0A0E1A';
      ctx.fillRect(0, 0, width, height);

      // Draw nodes and connections
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // Update node position
        node.x += node.vx;
        node.y += node.vy;
        
        // Bounce off edges
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        
        // Pulse effect
        node.pulseSize += node.pulseSpeed * node.pulseDirection;
        if (node.pulseSize > 1) node.pulseDirection = -1;
        if (node.pulseSize < 0) node.pulseDirection = 1;
        
        // Draw connections between nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const otherNode = nodes[j];
          const dx = otherNode.x - node.x;
          const dy = otherNode.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Only connect nodes that are close enough
          if (distance < 180) {
            // Make lines more transparent the further apart they are
            const opacity = 1 - (distance / 180);
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.strokeStyle = `rgba(93, 127, 255, ${opacity * 0.25})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
        
        // Draw the node with pulse effect
        const displayRadius = node.radius * (1 + node.pulseSize * 0.3);
        
        // Draw subtle glow effect
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, displayRadius * 3
        );
        gradient.addColorStop(0, node.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, displayRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.1;
        ctx.fill();
        
        // Draw the node
        ctx.beginPath();
        ctx.arc(node.x, node.y, displayRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        
        // Reset alpha
        ctx.globalAlpha = 1;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <>
      <BackgroundContainer>
        <Canvas ref={canvasRef} />
      </BackgroundContainer>
      <ContentLayer>{children}</ContentLayer>
    </>
  );
};

export default Background;