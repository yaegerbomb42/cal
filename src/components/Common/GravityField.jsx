import React, { Suspense, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, BallCollider, CuboidCollider } from '@react-three/rapier';
import { Float, Text, Environment, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const Particle = ({ position, color, symbol }) => {
  const rigidBodyRef = useRef();

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      colliders="cuboid"
      restitution={0.7}
      friction={0.2}
      linearDamping={0.5}
      angularDamping={0.5}
    >
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color={color} roughness={0.1} metalness={0.8} />
        </mesh>
        <Text
          position={[0, 0, 0.26]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {symbol}
        </Text>
      </Float>
    </RigidBody>
  );
};

const Floor = () => (
  <RigidBody type="fixed" position={[0, -5, 0]}>
    <CuboidCollider args={[20, 0.5, 20]} />
    <mesh receiveShadow>
      <boxGeometry args={[40, 1, 40]} />
      <meshStandardMaterial transparent opacity={0} />
    </mesh>
  </RigidBody>
);

const Walls = () => (
  <>
    <RigidBody type="fixed" position={[-10, 0, 0]}>
      <CuboidCollider args={[0.5, 10, 20]} />
    </RigidBody>
    <RigidBody type="fixed" position={[10, 0, 0]}>
      <CuboidCollider args={[0.5, 10, 20]} />
    </RigidBody>
    <RigidBody type="fixed" position={[0, 0, -10]}>
      <CuboidCollider args={[20, 10, 0.5]} />
    </RigidBody>
    <RigidBody type="fixed" position={[0, 0, 10]}>
      <CuboidCollider args={[20, 10, 0.5]} />
    </RigidBody>
  </>
);

const MouseAttractor = () => {
  const attractorRef = useRef();
  const [mousePos] = useState(() => new THREE.Vector3());

  useFrame((state) => {
    const { mouse, viewport } = state;
    mousePos.set((mouse.x * viewport.width) / 2, (mouse.y * viewport.height) / 2, 0);
    if (attractorRef.current) {
      attractorRef.current.setNextKinematicTranslation(mousePos);
    }
  });

  return (
    <RigidBody ref={attractorRef} type="kinematicPosition" colliders={false}>
      <BallCollider args={[1]} />
    </RigidBody>
  );
};

const GravityField = () => {
  const particles = useMemo(() => {
    const symbols = ['+', '-', '×', '÷', '=', '√', 'π', '%'];
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 10,
        5 + Math.random() * 10,
        (Math.random() - 0.5) * 5
      ],
      color: i % 2 === 0 ? '#FF3B30' : '#000000',
      symbol: symbols[i % symbols.length]
    }));
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }}>
      <Canvas shadows camera={{ position: [0, 0, 12], fov: 35 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} castShadow />
          <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          
          <Physics gravity={[0, -9.81, 0]}>
            {particles.map((p) => (
              <Particle key={p.id} {...p} />
            ))}
            <Floor />
            <Walls />
            <MouseAttractor />
          </Physics>

          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GravityField;
