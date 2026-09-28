import { WebGLRenderer } from 'three';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0xf2ecdf);
renderer.clear();
