# 3D Smartphone Model Slot

Place `free_xiaomi_17_pro_max.glb` in this directory (`src/assets/models/free_xiaomi_17_pro_max.glb`).

When present, Vite automatically bundles it and `src/three/hardware-scene.ts` loads it via `GLTFLoader` + `DRACOLoader`, normalizes its scale/orientation, applies studio PBR lighting, and maps the real KodaHosting Android app screenshots (`dashboard.webp`, `console.webp`, `files.webp`) onto the front screen surface.

When no `.glb` file is placed here, the scene falls back seamlessly to the procedural Xiaomi 17 hardware model with zero 404 network requests.

Model attribution (CC BY 4.0):
"(Free) Xiaomi 17 pro max" by TahmidTauz (https://sketchfab.com/3d-models/free-xiaomi-17-pro-max-014f9880c8764d18b3f4f00aac165a5d)
