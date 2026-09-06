import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  assemblyKey,
  assemblySpec,
  foldedDepth,
  stoneIndices,
  torsoDepth,
  packedStoneSeats,
  type FilledContour,
  type AssemblySpec,
} from "./assembly";
import type { Draft, View } from "../model";

const outlineCache = new Map<string, Promise<THREE.Shape[]>>();
const stoneSeatCache = new Map<string, ReturnType<typeof packedStoneSeats>>();
function outlines(path: string) {
  let result = outlineCache.get(path);
  if (!result) {
    result = fetch(path)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Outline unavailable: ${path}`);
        const svg = new SVGLoader().parse(await response.text());
        const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p));
        if (!shapes.length) throw new Error(`Empty pendant outline: ${path}`);
        return shapes;
      })
      .catch((error) => {
        outlineCache.delete(path);
        throw error;
      });
    outlineCache.set(path, result);
  }
  return result;
}
const goldColors = {
  "Yellow gold": 0xc89332,
  "White gold": 0xdce1e4,
  "Rose gold": 0xd69b83,
};
const stoneColors = {
  "Lab diamond": 0xf4fbff,
  "Natural diamond": 0xf4fbff,
  Ruby: 0x74051b,
  Emerald: 0x005b32,
  "Blue sapphire": 0x163b94,
  "Pink sapphire": 0xbb2c7b,
};
function metalMaterial(spec: AssemblySpec) {
  return new THREE.MeshPhysicalMaterial({
    color: goldColors[spec.metal],
    metalness: 1,
    roughness: 0.23,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.35,
  });
}
function disposeGroup(group: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      geometries.add(object.geometry);
      for (const m of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(m);
    }
  });
  geometries.forEach((x) => x.dispose());
  materials.forEach((x) => x.dispose());
}
function tube(
  group: THREE.Group,
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  closed = false,
  linear = false,
) {
  let curve: THREE.Curve<THREE.Vector3>;
  if (linear) {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < points.length; i++)
      path.add(new THREE.LineCurve3(points[i - 1]!, points[i]!));
    if (closed) path.add(new THREE.LineCurve3(points.at(-1)!, points[0]!));
    curve = path;
  } else curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      curve,
      Math.max(16, points.length * 5),
      radius,
      6,
      closed,
    ),
    material,
  );
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
function ellipse(
  group: THREE.Group,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  z: number,
  radius: number,
  material: THREE.Material,
) {
  const points = Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    return new THREE.Vector3(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, z);
  });
  return tube(group, points, radius, material, true);
}
function heart(
  group: THREE.Group,
  cx: number,
  cy: number,
  size: number,
  z: number,
  material: THREE.Material,
) {
  const pts = Array.from({ length: 64 }, (_, i) => {
    const t = (i / 64) * Math.PI * 2;
    return new THREE.Vector3(
      cx + size * Math.pow(Math.sin(t), 3),
      cy +
        (size *
          (13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t))) /
          16,
      z,
    );
  });
  tube(group, pts, 0.19, material, true);
}
/** Build the whole pendant in mm before attaching its chain. No field replaces another field. */
async function build(spec: AssemblySpec) {
  const shapeSets = await Promise.all(spec.outlines.map(outlines));
  const group = new THREE.Group(),
    pendant = new THREE.Group();
  group.add(pendant);
  group.userData.stoneCount = 0;
  group.userData.stoneSeats = 0;
  const material = metalMaterial(spec);
  const wordMaterial =
    spec.construction === "Origami ribbon" ? material.clone() : material;
  if (spec.construction === "Origami ribbon") wordMaterial.flatShading = true;
  const words = shapeSets.map((shapes, wordIndex) => {
    const flat = new THREE.ShapeGeometry(shapes, 10);
    flat.computeBoundingBox();
    const sourceWidth = flat.boundingBox!.max.x - flat.boundingBox!.min.x;
    flat.dispose();
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.5,
      bevelEnabled: true,
      bevelThickness: 0.065,
      bevelSize: (0.075 * sourceWidth) / 15,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 10,
    });
    geometry.scale(1, -1, 1);
    // A reflection reverses winding; restore it so the lit gold face stays in front.
    for (const attribute of Object.values(geometry.attributes)) {
      const array = attribute.array,
        size = attribute.itemSize;
      for (let i = 0; i < attribute.count; i += 3)
        for (let j = 0; j < size; j++) {
          const a = (i + 1) * size + j,
            b = (i + 2) * size + j,
            tmp = array[a]!;
          array[a] = array[b]!;
          array[b] = tmp;
        }
      attribute.needsUpdate = true;
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!,
      center = box.getCenter(new THREE.Vector3()),
      width = box.max.x - box.min.x;
    geometry.translate(-center.x, -center.y, -center.z);
    const scale = 15 / Math.max(width, 0.01);
    geometry.scale(scale, scale, 1);
    if (spec.construction === "Origami ribbon") {
      const p = geometry.getAttribute("position");
      for (let i = 0; i < p.count; i++)
        p.setZ(i, p.getZ(i) + foldedDepth(p.getX(i)));
      p.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    const components = shapes.map((shape) =>
      shape
        .getSpacedPoints(64)
        .map(
          (point) =>
            new THREE.Vector3(
              (point.x - center.x) * scale,
              (-point.y - center.y) * scale,
              -0.23,
            ),
        ),
    );
    const mesh = new THREE.Mesh(geometry, wordMaterial);
    mesh.userData.components = components;
    mesh.userData.outlinePath = spec.outlines[wordIndex];
    mesh.userData.surfaces = shapes.map((shape) => {
      const extracted = shape.extractPoints(16);
      const normalize = (points: THREE.Vector2[]) =>
        points.map((point) => ({
          x: (point.x - center.x) * scale,
          y: (-point.y - center.y) * scale,
        }));
      return {
        outer: normalize(extracted.shape),
        holes: extracted.holes.map(normalize),
      };
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pendant.add(mesh);
    return mesh;
  });
  if (spec.twoNames) {
    if (spec.layout === "Stacked" || spec.layout === "Interlocked") {
      const h = words.map(
        (word) =>
          new THREE.Box3().setFromObject(word).getSize(new THREE.Vector3()).y,
      );
      const gap = spec.layout === "Interlocked" ? 1.5 : 1.05;
      const offset = spec.layout === "Interlocked" ? 2.8 : 0;
      words[0]!.position.set(-offset, (h[1]! + gap) / 2, 0);
      words[1]!.position.set(offset, -(h[0]! + gap) / 2, 0);
    } else {
      const gap = spec.layout === "Side by side" ? 1.2 : 4.3;
      words[0]!.position.x = -7.5 - gap / 2;
      words[1]!.position.x = 7.5 + gap / 2;
    }
  }
  function closestWordPoint(word: THREE.Mesh, target: THREE.Vector3) {
    const p = word.geometry.getAttribute("position");
    let point = new THREE.Vector3(),
      distance = Infinity;
    for (let i = 0; i < p.count; i++) {
      const candidate = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).add(
        word.position,
      );
      const d = candidate.distanceToSquared(target);
      if (d < distance) {
        distance = d;
        point = candidate;
      }
    }
    return point;
  }
  // Minimal spanning connections join only the nearest disjoint outline components.
  // This preserves dots and separate letters without a full-width visible scaffold.
  for (const word of words) {
    const components = (word.userData.components as THREE.Vector3[][]).map(
      (component) =>
        component.map((p) => {
          const point = p.clone().add(word.position);
          if (spec.construction === "Origami ribbon")
            point.z += foldedDepth(p.x);
          return point;
        }),
    );
    const joined = new Set([0]);
    while (joined.size < components.length) {
      let best:
        | { end: number; a: THREE.Vector3; b: THREE.Vector3; distance: number }
        | undefined;
      for (const from of joined)
        for (let to = 0; to < components.length; to++)
          if (!joined.has(to))
            for (const a of components[from]!)
              for (const b of components[to]!) {
                const distance = a.distanceToSquared(b);
                if (!best || distance < best.distance)
                  best = { end: to, a, b, distance };
              }
      if (!best) break;
      if (best.distance > 0.0001)
        tube(pendant, [best.a, best.b], 0.085, material);
      joined.add(best.end);
    }
  }
  if (spec.twoNames) {
    if (spec.layout === "Connected heart")
      heart(pendant, 0, 0, 1.9, 0, material);
    else if (spec.layout === "Infinity") {
      const pts = Array.from({ length: 64 }, (_, i) => {
        const t = (i / 64) * Math.PI * 2;
        return new THREE.Vector3(
          2.1 * Math.cos(t),
          1.2 * Math.sin(2 * t),
          0.18 * Math.sin(t),
        );
      });
      tube(pendant, pts, 0.19, material, true);
    } else if (spec.layout === "Stacked") {
      const top = new THREE.Box3().setFromObject(words[0]!),
        bottom = new THREE.Box3().setFromObject(words[1]!);
      for (const x of [-4.5, 4.5]) {
        const upper = closestWordPoint(
          words[0]!,
          new THREE.Vector3(x, top.min.y, 0),
        );
        const lower = closestWordPoint(
          words[1]!,
          new THREE.Vector3(x, bottom.max.y, 0),
        );
        tube(pendant, [upper, lower], 0.13, material);
      }
    } else if (spec.layout === "Interlocked") {
      const upper = new THREE.Box3().setFromObject(words[0]!),
        lower = new THREE.Box3().setFromObject(words[1]!);
      const y = (upper.min.y + lower.max.y) / 2;
      ellipse(pendant, -0.4, y, 0.85, 0.68, 0, 0.15, material);
      ellipse(pendant, 0.4, y, 0.85, 0.68, 0.12, 0.15, material);
      const a = new THREE.Vector3(-0.4, y + 0.68, 0),
        b = new THREE.Vector3(0.4, y - 0.68, 0.12);
      tube(pendant, [closestWordPoint(words[0]!, a), a], 0.13, material);
      tube(pendant, [closestWordPoint(words[1]!, b), b], 0.13, material);
    } else {
      const a = closestWordPoint(words[0]!, new THREE.Vector3(0, 0, 0)),
        b = closestWordPoint(words[1]!, new THREE.Vector3(0, 0, 0));
      tube(pendant, [a, b], 0.15, material);
    }
    if (spec.layout === "Connected heart" || spec.layout === "Infinity") {
      for (let wi = 0; wi < words.length; wi++) {
        const word = words[wi]!,
          side = wi === 0 ? -1 : 1;
        const target = new THREE.Vector3(
          side * (spec.layout === "Connected heart" ? 1.9 : 2.1),
          spec.layout === "Connected heart" ? 0.475 : 0,
          0,
        );
        const p = word.geometry.getAttribute("position");
        let closest = new THREE.Vector3(),
          distance = Infinity;
        for (let i = 0; i < p.count; i++) {
          const at = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).add(
            word.position,
          );
          const delta = at.distanceToSquared(target);
          if (delta < distance) {
            distance = delta;
            closest = at;
          }
        }
        tube(pendant, [closest, target], 0.17, material);
      }
    }
  }
  let bounds = new THREE.Box3().setFromObject(pendant);
  const center = bounds.getCenter(new THREE.Vector3()),
    extent = bounds.getSize(new THREE.Vector3());
  if (spec.construction === "Framed minimal") {
    const x = extent.x / 2 + 1,
      y = extent.y / 2 + 1;
    const pts = [
      [-x, -y],
      [x, -y],
      [x, y],
      [-x, y],
    ].map(([a, b]) => new THREE.Vector3(a! + center.x, b! + center.y, -0.1));
    tube(pendant, pts, 0.23, material, true, true);
    for (const side of [-1, 1]) {
      const target = new THREE.Vector3(center.x + side * x, center.y, -0.1);
      let nearest = new THREE.Vector3(),
        distance = Infinity;
      for (const word of words) {
        const p = word.geometry.getAttribute("position");
        for (let i = 0; i < p.count; i++) {
          const at = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).add(
            word.position,
          );
          const delta = at.distanceToSquared(target);
          if (delta < distance) {
            distance = delta;
            nearest = at;
          }
        }
      }
      tube(pendant, [nearest, target], 0.18, material);
    }
  } else if (spec.construction === "Diamond rails") {
    for (const side of [-1, 1])
      tube(
        pendant,
        [
          new THREE.Vector3(
            bounds.min.x - 0.3,
            center.y + side * (extent.y / 2 + 0.6),
            0,
          ),
          new THREE.Vector3(
            bounds.max.x + 0.3,
            center.y + side * (extent.y / 2 + 0.6),
            0,
          ),
        ],
        0.24,
        material,
      );
    for (const x of [bounds.min.x, bounds.max.x])
      tube(
        pendant,
        [
          new THREE.Vector3(x, bounds.min.y - 0.6, 0),
          new THREE.Vector3(x, bounds.max.y + 0.6, 0),
        ],
        0.18,
        material,
      );
    for (const word of words) {
      const mid = new THREE.Box3()
        .setFromObject(word)
        .getCenter(new THREE.Vector3());
      tube(
        pendant,
        [
          closestWordPoint(
            word,
            new THREE.Vector3(mid.x, bounds.min.y - 0.6, 0),
          ),
          new THREE.Vector3(mid.x, bounds.min.y - 0.6, 0),
        ],
        0.16,
        material,
      );
    }
  } else if (spec.construction === "Origami ribbon") {
    // Angular folded backing follows the name's width while preserving the lettering face.
    const x0 = bounds.min.x - 0.6,
      x1 = bounds.max.x + 0.6,
      y = bounds.min.y - 0.45;
    const pts = [
      new THREE.Vector3(x0, y + 0.6, -0.25),
      new THREE.Vector3(x0 + (x1 - x0) * 0.2, y - 0.45, 0.05),
      new THREE.Vector3(x0 + (x1 - x0) * 0.5, y + 0.15, -0.2),
      new THREE.Vector3(x0 + (x1 - x0) * 0.8, y - 0.45, 0.05),
      new THREE.Vector3(x1, y + 0.6, -0.25),
    ];
    tube(pendant, pts, 0.44, material, false, true);
    for (const word of words) {
      tube(
        pendant,
        [
          closestWordPoint(
            word,
            new THREE.Vector3(word.position.x, y + 0.15, -0.2),
          ),
          new THREE.Vector3(word.position.x, y + 0.15, -0.2),
        ],
        0.18,
        material,
      );
    }
    for (const word of words) {
      word.geometry.computeVertexNormals();
    }
  }
  // Stone positions are sampled on the actual front-facing outline triangles.
  if (spec.coverage !== "No stones") {
    const diamond =
      spec.gem === "Lab diamond" || spec.gem === "Natural diamond";
    const stoneMaterial = new THREE.MeshPhysicalMaterial({
      color: stoneColors[spec.gem!],
      metalness: diamond ? 0.02 : 0,
      roughness: diamond ? 0.12 : 0.2,
      transmission: 0,
      ior: 2.4,
      clearcoat: diamond ? 0.8 : 0,
      specularColor: new THREE.Color(
        diamond ? 0xffffff : stoneColors[spec.gem!],
      ),
      specularIntensity: diamond ? 1 : 0.55,
      clearcoatRoughness: 0.12,
      envMapIntensity: diamond ? 1.7 : 0.65,
    });
    function cachedSeats(word: THREE.Mesh) {
      const path = word.userData.outlinePath as string;
      let seats = stoneSeatCache.get(path);
      if (!seats) {
        seats = packedStoneSeats(word.userData.surfaces as FilledContour[]);
        stoneSeatCache.set(path, seats);
      }
      return seats;
    }
    const placements = words.flatMap((word) =>
      cachedSeats(word).map((seat) => ({
        x: seat.x + word.position.x,
        y: seat.y + word.position.y,
        radius: seat.radius,
        z:
          0.315 +
          word.position.z +
          (spec.construction === "Origami ribbon" ? foldedDepth(seat.x) : 0),
      })),
    );
    const selected = stoneIndices(placements.length, spec.coverage);
    group.userData.stoneSeats = placements.length;
    group.userData.stoneCount = selected.length;
    if (selected.length) {
      const stones = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(1, 0),
        stoneMaterial,
        selected.length,
      );
      const bezels = new THREE.InstancedMesh(
        new THREE.TorusGeometry(0.86, 0.13, 5, 12),
        material,
        selected.length,
      );
      const transform = new THREE.Object3D();
      for (let j = 0; j < selected.length; j++) {
        const at = placements[selected[j]!]!;
        transform.position.set(at.x, at.y, at.z + at.radius * 0.23);
        transform.rotation.set(0, 0, Math.PI / 8);
        transform.scale.set(at.radius, at.radius, at.radius * 0.62);
        transform.updateMatrix();
        stones.setMatrixAt(j, transform.matrix);
        transform.position.z = at.z + 0.01;
        transform.rotation.set(0, 0, 0);
        transform.scale.setScalar(at.radius);
        transform.updateMatrix();
        bezels.setMatrixAt(j, transform.matrix);
      }
      stones.castShadow = true;
      bezels.castShadow = true;
      pendant.add(stones, bezels);
    } else stoneMaterial.dispose();
  }

  bounds = new THREE.Box3().setFromObject(pendant);
  const width = bounds.max.x - bounds.min.x;
  const scale = spec.size / width;
  pendant.scale.setScalar(scale);
  const midpoint = bounds.getCenter(new THREE.Vector3());
  pendant.position.set(-midpoint.x * scale, -midpoint.y * scale, 0);
  group.updateMatrixWorld(true);
  const metalPoints: THREE.Vector3[] = [];
  pendant.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object instanceof THREE.InstancedMesh ||
      !(object.material instanceof THREE.MeshPhysicalMaterial) ||
      object.material.metalness !== 1
    )
      return;
    const p = object.geometry.getAttribute("position");
    for (let i = 0; i < p.count; i++)
      metalPoints.push(
        new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(
          object.matrixWorld,
        ),
      );
  });
  for (const side of [-1, 1]) {
    const bodyPoints = metalPoints.filter(
      (p) => p.y < (bounds.max.y - midpoint.y) * scale * 0.52,
    );
    const extreme = bodyPoints.reduce(
      (best, p) => Math.max(best, side * p.x),
      -Infinity,
    );
    const near = bodyPoints.filter((p) => side * p.x > extreme - 0.35);
    const anchor = near
      .reduce((best, p) => (p.y > best.y ? p : best), near[0]!)
      .clone();
    const anchorX = anchor.x + side * 0.72,
      attachmentY = anchor.y + 0.28;
    const ringZ = anchor.z;
    ellipse(group, anchorX, attachmentY, 0.5, 0.7, ringZ, 0.14, material);
    tube(
      group,
      [anchor, new THREE.Vector3(anchorX - side * 0.42, attachmentY, ringZ)],
      0.16,
      material,
    );
    const depth = (x: number) => ringZ + torsoDepth(x) - torsoDepth(anchorX);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(anchorX, attachmentY + 0.6, ringZ),
      new THREE.Vector3(
        side * (spec.size * 0.5 + 3),
        Math.max(10, attachmentY + 4),
        depth(side * (spec.size * 0.5 + 3)),
      ),
      new THREE.Vector3(side * 22, 25, depth(side * 22)),
      new THREE.Vector3(side * 42, 78, depth(side * 42)),
    ]);
    const spacing =
      spec.chain === "Rolo"
        ? 0.72
        : spec.chain === "Box"
          ? 0.55
          : spec.chain === "Curb"
            ? 0.58
            : 0.72;
    const count = Math.ceil(curve.getLength() / spacing);
    let geometry: THREE.BufferGeometry;
    if (spec.chain === "Box") {
      const shape = new THREE.Shape();
      shape.moveTo(-0.36, -0.41);
      shape.lineTo(0.36, -0.41);
      shape.lineTo(0.36, 0.41);
      shape.lineTo(-0.36, 0.41);
      shape.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-0.2, -0.25);
      hole.lineTo(-0.2, 0.25);
      hole.lineTo(0.2, 0.25);
      hole.lineTo(0.2, -0.25);
      hole.closePath();
      shape.holes.push(hole);
      geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.18,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.025,
        bevelSegments: 1,
        steps: 1,
      });
      geometry.translate(0, 0, -0.09);
    } else
      geometry = new THREE.TorusGeometry(
        spec.chain === "Rolo" ? 0.48 : 0.4,
        spec.chain === "Curb" ? 0.15 : 0.12,
        5,
        12,
      );
    const links = new THREE.InstancedMesh(geometry, material, count);
    links.castShadow = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1),
        point = curve.getPointAt(t),
        direction = curve.getTangentAt(t);
      dummy.position.copy(point);
      dummy.rotation.set(0, 0, -Math.atan2(direction.x, direction.y));
      dummy.scale.set(1, 1, 1);
      if (spec.chain === "Cable") {
        dummy.scale.y = 1.35;
        dummy.rotateY(i % 2 ? Math.PI * 0.34 : 0);
      }
      if (spec.chain === "Curb") {
        dummy.scale.set(1.4, 0.82, 0.6);
        dummy.rotateY(0.25);
      }
      if (spec.chain === "Rolo") dummy.rotateY(i % 2 ? Math.PI * 0.38 : 0);
      if (spec.chain === "Box") dummy.rotateY(i % 2 ? Math.PI / 2 : 0);
      dummy.updateMatrix();
      links.setMatrixAt(i, dummy.matrix);
    }
    group.add(links);
  }
  return group;
}

export async function createRenderer(canvas: HTMLCanvasElement): Promise<{
  apply(draft: Draft): Promise<void>;
  capture(view: View, width?: number): Promise<Blob>;
  inspect(): {
    key: string;
    assemblyId: string;
    stoneCount: number;
    stoneSeats: number;
  };
  dispose(): void;
}> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(1024, 1024, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(-29, 29, 29, -29, 0.1, 300);
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment(),
    environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const ambient = new THREE.AmbientLight(0xfff4e2, 1.5);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfff1d9, 4);
  key.position.set(-20, 30, 55);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -35;
  key.shadow.camera.right = 35;
  key.shadow.camera.top = 40;
  key.shadow.camera.bottom = -30;
  key.shadow.normalBias = 0.05;
  key.shadow.bias = -0.0002;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe2eeff, 2);
  rim.position.set(25, -5, 25);
  scene.add(rim);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 18),
    new THREE.ShadowMaterial({ opacity: 0.12 }),
  );
  floor.position.set(0, -1, -0.95);
  floor.receiveShadow = true;
  scene.add(floor);
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(100, 100, 100, 48, 1, true, -0.65, 1.3),
    new THREE.ShadowMaterial({ opacity: 0.16 }),
  );
  torso.position.z = -101.8;
  torso.receiveShadow = true;
  torso.visible = false;
  scene.add(torso);
  const textureLoader = new THREE.TextureLoader();
  const backgrounds = new Map<string, THREE.Texture>();
  await Promise.all(
    ["studio", "skin", "dark"].map(async (name) => {
      try {
        const texture = await textureLoader.loadAsync(
          `/atelier/scenes/v1/${name}.png`,
        );
        texture.colorSpace = THREE.SRGBColorSpace;
        backgrounds.set(name, texture);
      } catch {
        /* Neutral background still renders the identical jewelry scene. */
      }
    }),
  );
  let jewelry: THREE.Group | undefined,
    revision = 0,
    disposed = false,
    applied = false,
    currentKey = "";
  function render(view: View, width: number) {
    if (disposed) throw new Error("Renderer disposed");
    const span = view === "Close-up" ? 20 : view === "On skin" ? 50 : 29;
    camera.left = -span;
    camera.right = span;
    camera.top = span;
    camera.bottom = -span;
    camera.updateProjectionMatrix();
    const isSkin = view === "On skin",
      isDark = view === "Dark";
    scene.background =
      backgrounds.get(isSkin ? "skin" : isDark ? "dark" : "studio") ??
      new THREE.Color(isDark ? 0x191714 : isSkin ? 0xc09278 : 0xf3efe7);
    if (jewelry) {
      jewelry.position.y = isSkin ? -10 : -1;
      jewelry.rotation.set(isSkin ? -0.05 : 0, 0, 0);
    }
    floor.visible = !isSkin;
    torso.visible = isSkin;
    ambient.intensity = isDark ? 0.5 : 1.5;
    key.intensity = isDark ? 4 : 3;
    rim.intensity = isDark ? 3 : 2;
    renderer.toneMappingExposure = isDark ? 0.9 : 0.95;
    renderer.setSize(width, width, false);
    renderer.render(scene, camera);
  }
  return {
    async apply(draft) {
      const ticket = ++revision,
        key = assemblyKey(draft);
      if (disposed) throw new Error("Renderer disposed");
      if (applied && key === currentKey) return;
      const next = await build(assemblySpec(draft));
      if (disposed || ticket !== revision) {
        disposeGroup(next);
        throw new DOMException("Superseded design render", "AbortError");
      }
      if (jewelry) {
        scene.remove(jewelry);
        disposeGroup(jewelry);
      }
      jewelry = next;
      scene.add(next);
      applied = true;
      currentKey = key;
    },
    async capture(view, width = 1024) {
      if (!applied) throw new Error("Apply a design before capturing");
      render(view, Math.min(2048, Math.max(256, Math.round(width))));
      return new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Preview capture failed")),
          "image/png",
        ),
      );
    },
    inspect() {
      return {
        key: currentKey,
        assemblyId: jewelry?.uuid ?? "",
        stoneCount: Number(jewelry?.userData.stoneCount ?? 0),
        stoneSeats: Number(jewelry?.userData.stoneSeats ?? 0),
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      revision++;
      if (jewelry) disposeGroup(jewelry);
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      torso.geometry.dispose();
      (torso.material as THREE.Material).dispose();
      backgrounds.forEach((x) => x.dispose());
      environment.dispose();
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
