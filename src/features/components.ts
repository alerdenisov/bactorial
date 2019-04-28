import THREE = require('three');
import { World } from 'hecs';

export type EntityId = number;

export class Position extends THREE.Vector2 {}
export class Velocity extends THREE.Vector2 {}
export class Radius {
  constructor(public value: number) {}
}

export class Bacteria {}
export class Spliting {}
export class Attacking {}
export class Target {
    constructor(public target : EntityId) {}
}

export function registerAllComponent(world : World) {
  world.registerComponent(Position)
  world.registerComponent(Velocity)
  world.registerComponent(Radius)
  world.registerComponent(Bacteria)
  world.registerComponent(Spliting)
  world.registerComponent(Attacking)
  world.registerComponent(Target)
}