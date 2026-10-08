// Sizes are logical screen pixels (screen is 960×540), times are ms, speeds are px/s.
export const GAME_W = 960;
export const GAME_H = 540;
export const TILE = 60;

export const SKY_TOP = 0x6ec6ff;
export const SKY_BOTTOM = 0xd8f1ff;

export const HERO_SCALE = 0.7; // also used for the zombie: its frames are drawn at the hero's size
export const BODY_WIDTH = 0.4; // physics body width as a fraction of the sprite cell
export const WALK_SPEED = 220;
export const JUMP_SPEED = 700;
export const GRAVITY = 1800;
export const CROUCH_TIME = 80;
export const LAND_TIME = 120;

export const BOLT_FRAME = 2; // shoot frame on which the bolt leaves the muzzle
export const BOLT_SPEED = 900;
export const BOLT_LIFE = 1200;

export const ZOMBIE_SPEED = 60;
export const ATTACK_RANGE = TILE * 1.5;
export const ATTACK_COOLDOWN = 800; // patrol time after a lunge before the next one
export const STOMP_BOUNCE = 400;

export const BLINK_TIME = 300;
export const FADE_TIME = 150;
export const FALL_MARGIN = 200; // how far below the level the hero falls before he is sent back
export const CAMERA_LEAD = 120;
export const PARALLAX = [0.1, 0.2, 0.5]; // clouds, far hills, near hills
export const DEBRIS = 6;

export const BUTTON_SIZE = 110;
export const BUTTON_MARGIN = 24;
export const BUTTON_SLOP = 10; // hit circle radius beyond the drawn circle: the zone is 20 px wider

export const LIVES = 3;
export const STAR_DELAY = 300; // pause between stars popping up on the win screen

export const MENU_TILE = 140; // level tile side in the menu, shrinks on narrow screens
export const MENU_GAP = 24;
export const PAUSE_GAP = 70; // ⏸ sits at the right edge, ⛶ this far to its left
