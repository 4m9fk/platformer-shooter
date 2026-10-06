import Phaser from 'phaser';
import { AtlasGame, applyAnchor, atlasGame, fitBody } from '../atlas';
import { BOLT_FRAME, CROUCH_TIME, HERO_SCALE, JUMP_SPEED, LAND_TIME, STOMP_BOUNCE, WALK_SPEED } from '../config';
import type { Intent } from '../input/Intent';
import { JumpPhase, jumpAirFrame, swallowsJump } from './jumpFrame';

export type HeroMode = 'idle' | 'walk' | 'jump' | 'shoot' | 'frozen';
export type Facing = 1 | -1;

/** The boy with the blaster. Reads only the Intent; x/y is the point between his feet. */
export class Hero extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  mode: HeroMode = 'idle';
  facing: Facing = 1;
  onFire: (x: number, y: number, dir: Facing) => void = () => {};
  private phase: JumpPhase = 'crouch';
  private phaseTime = 0;
  private jumpCut = false;
  private boltFired = false;
  private shootQueued = false;
  private readonly meta: AtlasGame;
  private readonly intent: Intent;

  constructor(scene: Phaser.Scene, x: number, y: number, intent: Intent) {
    super(scene, x, y, 'hero', 'idle_0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.intent = intent;
    this.meta = atlasGame(scene, 'hero');
    this.setScale(HERO_SCALE);
    this.face(1, true);
    this.play('hero-idle');
  }

  step(delta: number) {
    if (this.mode === 'frozen') return;
    const s = this.intent.state;
    const dir = (s.right ? 1 : 0) - (s.left ? 1 : 0);
    const onGround = this.body.blocked.down || this.body.touching.down;
    if (this.mode === 'jump') return this.stepJump(delta, dir, onGround, s.jump);
    if (this.mode === 'shoot') return this.stepShoot();
    if (!onGround) return this.enterAir();
    if (this.intent.consume('jump')) return this.startJump();
    if (this.intent.consume('shoot') || s.shoot) return this.startShoot();
    if (dir !== 0) {
      this.face(dir as Facing);
      this.setVelocityX(dir * WALK_SPEED);
      this.setMode('walk');
    } else {
      this.setVelocityX(0);
      this.setMode('idle');
    }
  }

  bounce() {
    this.enterAir();
    this.setVelocityY(-STOMP_BOUNCE);
  }

  freeze() {
    this.mode = 'frozen';
    this.setVelocity(0, 0);
    this.play('hero-idle');
  }

  die() {
    this.freeze();
    this.body.enable = false;
  }

  respawn(x: number, y: number) {
    this.body.enable = true;
    this.body.reset(x, y);
    this.setAlpha(1);
    this.face(1, true);
    this.mode = 'idle';
    this.play('hero-idle');
  }

  private face(dir: Facing, force = false) {
    if (dir === this.facing && !force) return;
    this.facing = dir;
    this.setFlipX(dir < 0);
    applyAnchor(this, this.meta.anims.idle); // all hero animations share one cell and anchor
    fitBody(this, this.meta);
  }

  private setMode(mode: 'idle' | 'walk') {
    if (this.mode === mode) return;
    this.mode = mode;
    this.play(`hero-${mode}`);
  }

  private startJump() {
    this.mode = 'jump';
    this.phase = 'crouch';
    this.phaseTime = 0;
    this.jumpCut = false;
    this.anims.stop();
    this.setFrame('jump_0');
  }

  /** In the air without a jump (walked off a ledge, bounced off a zombie): no short-hop cut. */
  private enterAir() {
    this.mode = 'jump';
    this.phase = 'air';
    this.phaseTime = 0;
    this.jumpCut = true;
    this.anims.stop();
  }

  private stepJump(delta: number, dir: number, onGround: boolean, held: boolean) {
    this.phaseTime += delta;
    if (swallowsJump(this.phase)) this.intent.consume('jump');
    this.intent.consume('shoot'); // no shooting in the air: there are no frames for it
    if (dir !== 0) this.face(dir as Facing);
    this.setVelocityX(this.phase === 'land' ? 0 : dir * WALK_SPEED);
    if (this.phase === 'crouch') {
      this.setFrame('jump_0');
      if (this.phaseTime >= CROUCH_TIME) {
        this.phase = 'air';
        this.phaseTime = 0;
        this.setVelocityY(-JUMP_SPEED);
      }
    } else if (this.phase === 'air') {
      const vy = this.body.velocity.y;
      if (!held && !this.jumpCut && vy < 0) {
        this.jumpCut = true; // short press -> lower jump
        this.setVelocityY(vy / 2);
      }
      if (onGround && vy >= 0) {
        this.phase = 'land';
        this.phaseTime = 0;
        this.setFrame('jump_5');
      } else {
        this.setFrame(`jump_${jumpAirFrame(vy, JUMP_SPEED)}`);
      }
    } else if (this.phaseTime >= LAND_TIME) {
      this.mode = 'idle';
      this.play('hero-idle');
    }
  }

  private startShoot() {
    this.mode = 'shoot';
    this.boltFired = false;
    this.shootQueued = false;
    this.setVelocityX(0);
    this.play('hero-shoot');
  }

  private stepShoot() {
    this.setVelocityX(0);
    if (this.intent.consume('shoot')) this.shootQueued = true;
    const frame = Number(String(this.frame.name).split('_')[1]);
    if (!this.boltFired && frame >= BOLT_FRAME) {
      this.boltFired = true;
      this.fire();
    }
    if (this.anims.isPlaying) return;
    if (this.shootQueued || this.intent.state.shoot) this.startShoot();
    else {
      this.mode = 'idle';
      this.play('hero-idle');
    }
  }

  private fire() {
    const m = this.meta.muzzle!;
    const a = this.meta.anims.shoot;
    const x = this.x + (m.x - a.anchor.x) * HERO_SCALE * this.facing;
    const y = this.y + (m.y - a.anchor.y) * HERO_SCALE;
    this.onFire(x, y, this.facing);
  }
}
